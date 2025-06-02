import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { TrackerComponent } from "../tracker/tracker.component";
import { ActivatedRoute } from "@angular/router";
import { SocketService } from "../services/SocketService";
import { Config } from "../shared/config";
import { AutoswitchComponent } from "../autoswitch/autoswitch.component";
import {
  Rive,
  Fit,
  Alignment,
  Layout,
  ImageAsset,
  FontAsset,
  FileAsset,
  RiveParameters, // Import RiveParameters
} from "@rive-app/canvas"; // Ensure Rive is imported
import { AgentNameService } from "../services/agentName.service";
import { AgentRoleService } from "../services/agentRole.service";

// Define loadAndDecodeImage outside or as a static/private helper method
// if it doesn't need `this` context from the class instance directly,
// or pass necessary context if it does.
async function loadAndDecodeImageHelper(asset: FileAsset, url: string, targetWidth?: number, targetHeight?: number): Promise<boolean> {
  let imageBitmap: ImageBitmap | null = null; // Declare imageBitmap here so it's visible in finally
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image (HTTP status not OK): ${url}, status: ${response.status}`);
      try {
        const errorText = await response.text();
        console.warn(`Error response body for ${url} (status ${response.status}): ${errorText.substring(0, 500)}`);
      } catch (e) { /* ignore if can't read body */ }
      return false;
    }

    const contentType = response.headers.get("Content-Type");
    if (!contentType || !contentType.startsWith("image/")) {
      console.warn(`Fetched resource is not an image type: ${url}, Content-Type: ${contentType}`);
      try {
        const textResponse = await response.clone().text();
        console.warn(`Response body for non-image type ${url}: ${textResponse.substring(0, 500)}...`);
      } catch (textError) {
        console.warn(`Could not get text from non-image type response for ${url}`, textError);
      }
      return false;
    }

    const imageBlob = await response.blob();
    let imageBytesToDecode: Uint8Array;

    if (targetWidth && targetHeight) {
      imageBitmap = await createImageBitmap(imageBlob); // Assign to the scoped variable
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d")!;
      
      const scale = Math.min(targetWidth / imageBitmap.width, targetHeight / imageBitmap.height);
      const drawWidth = imageBitmap.width * scale;
      const drawHeight = imageBitmap.height * scale;
      const dx = (canvas.width - drawWidth) / 2;
      const dy = (canvas.height - drawHeight) / 2;
      
      ctx.drawImage(imageBitmap, dx, dy, drawWidth, drawHeight);
      
      const resizedBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png"); // Using "image/png" for consistency
      });
      
      if (!resizedBlob) {
        console.warn(`Canvas toBlob returned null for ${url}`);
        if (imageBitmap) imageBitmap.close(); // Close bitmap before returning false
        return false;
      }
      imageBytesToDecode = new Uint8Array(await resizedBlob.arrayBuffer());
      // imageBitmap.close(); // MOVED: Close after all operations are done
    } else {
      imageBytesToDecode = new Uint8Array(await imageBlob.arrayBuffer());
    }

    (asset as ImageAsset).decode(imageBytesToDecode);
    return true;
  } catch (e) {
    console.warn(`Failed to load and decode image for ${url}`, e);
    return false;
  } finally {
    // Ensure imageBitmap is closed if it was created, regardless of success or failure within the try block for resizing
    if (imageBitmap) { // imageBitmap is only assigned if targetWidth and targetHeight are present
      imageBitmap.close();
    }
  }
}

@Component({
  selector: "app-agent-select",
  templateUrl: "./agent-select.component.html",
  styleUrls: ["./agent-select.component.scss"],
})
export class AgentSelectComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(TrackerComponent) trackerComponent!: TrackerComponent;
  logoWidth = 2500;
  logoHeight = 2500;
  groupCode = "UNKNOWN";
  socketService!: SocketService;

  match: any;
  teamLeft: any;
  teamRight: any;
  team1Url: string = "";
  team2Url: string = "";

  private riveInstance: Rive | null = null; // Use Rive type
  private riveInitialized = false;
  private imagesToPreload: string[] = [];
  private canvasElement: HTMLCanvasElement | null = null;

  constructor(private route: ActivatedRoute, private config: Config) {
    this.route.queryParams.subscribe((params) => {
      this.groupCode = params["groupCode"]?.toUpperCase() || "UNKNOWN";
    });
  }

  ngOnInit(): void {
    this.initMatch(); // Initialize default match structure
    // Socket initialization and subscription will be done after preloading
  }

  ngAfterViewInit(): void {
    // Ensure the DOM is ready for canvas creation
    this.collectImageUrlsToPreload();
    this.preloadImages()
      .then(() => {
        console.log("All assets preloaded (cache warmed). Initializing Rive.");
        
        // Initialize and subscribe to socket service after preloading and Rive setup
        this.socketService = SocketService.getInstance(
          this.config.serverEndpoint,
          this.groupCode
        );
        this.socketService.subscribe((data: any) => {
          this.updateMatch(data);
        });
      })
      .catch(error => {
        console.error("Error preloading images:", error);
        // Optionally, still try to initialize Rive or show an error state
      });
  }

  private initMatch(): void {
    // ... (your existing initMatch logic)
    this.match = {
      groupCode: "A",
      isRanked: false,
      isRunning: true,
      roundNumber: 0,
      roundPhase: "LOBBY", // Default to LOBBY or appropriate initial state
      teams: [
        { players: [], teamUrl: "", teamName: "TEAM A", isAttacking: false },
        { players: [], teamUrl: "", teamName: "TEAM B", isAttacking: false }
      ],
      spikeState: { planted: false },
      map: "Ascent",
      tools: {
        seriesInfo: { needed: 1, wonLeft: 0, wonRight: 0, mapInfo: [] },
        tournamentInfo: { logoUrl: "", name: "" }
      },
    };
    this.teamLeft = this.match.teams[0];
    this.teamRight = this.match.teams[1];
  }

  private collectImageUrlsToPreload(): void {
    if (!this.match) return;
    this.imagesToPreload = [];
    // Agent portraits and roles
    const allPlayers = [...this.match.teams[0].players, ...this.match.teams[1].players];
    allPlayers.forEach(player => {
      if (player?.agentInternal) {
        this.imagesToPreload.push(`/assets/agent-portraits/${player.agentInternal}Portrait.webp`);
        const role = AgentRoleService.getAgentRole(player.agentInternal);
        this.imagesToPreload.push(`/assets/roles/${role}.webp`);
      }
    });

    // Team logos
    let team1Url = this.match.teams[0].teamUrl || "../../assets/misc/icon.webp";
    if (/^https?:\/\//.test(team1Url) && !team1Url.startsWith('/proxy-image')) {
      team1Url = `/proxy-image?url=${encodeURIComponent(team1Url)}`;
    }
    this.imagesToPreload.push(team1Url);

    let team2Url = this.match.teams[1].teamUrl || "../../assets/misc/icon.webp";
    if (/^https?:\/\//.test(team2Url) && !team2Url.startsWith('/proxy-image')) {
      team2Url = `/proxy-image?url=${encodeURIComponent(team2Url)}`;
    }
    this.imagesToPreload.push(team2Url);

    if (this.match.map) {
      this.imagesToPreload.push(`/assets/maps/${this.match.map}.jpg`);
    }
    let eventLogoUrl = this.match.tools?.tournamentInfo?.logoUrl && this.match.tools.tournamentInfo.logoUrl !== ""
          ? this.match.tools.tournamentInfo.logoUrl
          : "../../assets/misc/logo.webp";
    if (/^https?:\/\//.test(eventLogoUrl) && !eventLogoUrl.startsWith('/proxy-image')) {
      eventLogoUrl = `/proxy-image?url=${encodeURIComponent(eventLogoUrl)}`;
    }
    this.imagesToPreload.push(eventLogoUrl);
    this.imagesToPreload.push("/assets/agentSelect/img_13-3594105.png"); // Static asset
    // Add font URLs if you were to preload them, though Rive handles font fetching via assetLoader
  }

  private preloadImages(): Promise<void[]> {
    const promises = this.imagesToPreload.filter(url => !!url).map(url => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = (err) => {
          console.warn(`Failed to preload image: ${url}`, err);
          resolve(); // Resolve even on error to not block, or reject if critical
        };
        img.src = url;
      });
    });
    return Promise.all(promises);
  }

  public updateMatch(data: any) {
    delete data.eventNumber;
    delete data.replayLog;
    this.match = data;

    this.team1Url = this.match.teams[0].teamUrl || "../../assets/misc/icon.webp";
    this.team2Url = this.match.teams[1].teamUrl || "../../assets/misc/icon.webp";
    this.teamLeft = this.match.teams[0];
    this.teamRight = this.match.teams[1];

    // Only initialize Rive once, and only when both team URLs are set (not empty)
    if (
      !this.riveInitialized &&
      this.match.teams[0].teamUrl &&
      this.match.teams[1].teamUrl
    ) {
      this.initRiveOnce();
      return;
    }

    // If Rive is initialized, update its properties.
    if (this.riveInstance && this.riveInitialized) {
      this.updateRiveTextsAndInputs();
    } else if (!this.riveInitialized) {
      console.log("Match data updated, Rive not yet initialized. Will use new data on init.");
    }
  }
  
  private updateRiveTextsAndInputs(): void {
    if (!this.riveInstance || !this.match) {
      console.log("updateRiveTextsAndInputs: Skipping, Rive instance or match data not available.");
      return;
    }
    console.log("updateRiveTextsAndInputs: Called");

    const viewModelInstance = (this.riveInstance as any).viewModelInstance;
    console.log("updateRiveTextsAndInputs: viewModelInstance:", viewModelInstance);

    if (viewModelInstance) {
      // Color assignment logic removed
      // setTimeout block for color assignment removed
    } else {
      console.error("Rive ViewModelInstance not found. Ensure 'autoBind: true' is set in Rive parameters and a default ViewModel (e.g., named 'Default') is configured in the Rive editor for the artboard.");
    }

    const leftTeamSideText = this.match.teams[0].isAttacking ? "ATK" : "DEF";
    const rightTeamSideText = this.match.teams[1].isAttacking ? "ATK" : "DEF";
    this.riveInstance.setTextRunValue("leftTeamName", this.match.teams[0].teamName?.toUpperCase() || "");
    this.riveInstance.setTextRunValue("leftTeamSide", leftTeamSideText);
    this.riveInstance.setTextRunValue("rightTeamName", this.match.teams[1].teamName?.toUpperCase() || "");
    this.riveInstance.setTextRunValue("rightTeamSide", rightTeamSideText);
    this.riveInstance.setTextRunValue("mapName", this.match.map?.toUpperCase() || "");

    // Calculate current map number in the series
    const seriesInfo = this.match.tools?.seriesInfo;
    let mapNum = 1;
    if (seriesInfo) {
      const mapsPlayed = (seriesInfo.wonLeft || 0) + (seriesInfo.wonRight || 0);
      mapNum = mapsPlayed + 1;
      // Clamp to max needed if you want to avoid showing e.g. "MAP 4" in a Bo3
      if (seriesInfo.needed && mapNum > seriesInfo.needed) {
        mapNum = seriesInfo.needed;
      }
    }

    this.riveInstance.setTextRunValue("mapNum", "MAP " + mapNum);

    const leftPlayers = this.match.teams[0].players;
    const rightPlayers = this.match.teams[1].players;
    for (let i = 0; i < 5; i++) {
      const leftPlayer = leftPlayers[i];
      this.riveInstance.setTextRunValue(`L${i + 1}Name`, leftPlayer ? leftPlayer.name.toUpperCase() : "");
      this.riveInstance.setTextRunValue(`L${i + 1}Agent`, leftPlayer ? AgentNameService.getAgentName(leftPlayer.agentInternal)?.toUpperCase() || "" : "");

      const rightPlayer = rightPlayers[i];
      this.riveInstance.setTextRunValue(`R${i + 1}Name`, rightPlayer ? rightPlayer.name.toUpperCase() : "");
      this.riveInstance.setTextRunValue(`R${i + 1}Agent`, rightPlayer ? AgentNameService.getAgentName(rightPlayer.agentInternal)?.toUpperCase() || "" : "");
    }
  }

  private initRiveOnce(): void {
    if (this.riveInitialized || !this.match) { 
      return;
    }

    const container = document.querySelector(".agent-select-animation");
    if (!container) {
      console.error("Rive container .agent-select-animation not found.");
      return;
    }
    
    this.canvasElement = document.createElement("canvas");
    this.canvasElement.width = 1920;
    this.canvasElement.height = 1080;
    // Hide the canvas initially to prevent flash of placeholder text
    this.canvasElement.style.visibility = 'hidden'; 
    
    container.querySelectorAll("canvas").forEach((c) => c.remove()); 
    container.appendChild(this.canvasElement);

    const riveParams: RiveParameters = {
      src: "/assets/agentSelect/agent_select.riv",
      canvas: this.canvasElement,
      autoplay: false,
      autoBind: true, 
      // @ts-ignore - Rive runtime supports async assetLoader, type definition is outdated
      assetLoader: async (asset: FileAsset, bytes: Uint8Array) => {
        const imageMatch = asset.name.match(/^([LR])(\d+)_agent$|^([LR])(\d+)_role$/i);
        if (asset.isImage && imageMatch) {
          const side = imageMatch[1] || imageMatch[3];
          const idx = parseInt(imageMatch[2] || imageMatch[4], 10) - 1;
          let player;

          if (side === "L" && this.match?.teams?.[0]?.players?.[idx]) {
            player = this.match.teams[0].players[idx];
          } else if (side === "R" && this.match?.teams?.[1]?.players?.[idx]) {
            player = this.match.teams[1].players[idx];
          }

          if (player?.agentInternal) {
            if (asset.name.includes("agent")) {
              const url = `/assets/agent-portraits/${player.agentInternal}Portrait.webp`;
              return loadAndDecodeImageHelper(asset, url); 
            } else { // role
              const role = AgentRoleService.getAgentRole(player.agentInternal);
              if (role) {
                const url = `/assets/roles/${role}.webp`;
                return loadAndDecodeImageHelper(asset, url); 
              } else {
                console.warn(`Role not found for agent ${player.agentInternal} for Rive asset '${asset.name}'. Cannot load.`);
                return false;
              }
            }
          } else {
            console.warn(`Player data or agentInternal missing for Rive asset '${asset.name}'. Cannot load.`);
            return false;
          }
        }

        if (asset.isImage && asset.name === "leftTeamLogo") {
          let url = this.match?.teams?.[0]?.teamUrl || "../../assets/misc/icon.webp";
          if (/^https?:\/\//.test(url) && !url.startsWith('/proxy-image')) url = `/proxy-image?url=${encodeURIComponent(url)}`;
          return loadAndDecodeImageHelper(asset, url, this.logoWidth, this.logoHeight);
        }

        if (asset.isImage && asset.name === "rightTeamLogo") {
          let url = this.match?.teams?.[1]?.teamUrl || "../../assets/misc/icon.webp";
          if (/^https?:\/\//.test(url) && !url.startsWith('/proxy-image')) url = `/proxy-image?url=${encodeURIComponent(url)}`;
          return loadAndDecodeImageHelper(asset, url, this.logoWidth, this.logoHeight);
        }

        if (asset.isImage && asset.name === "img_14") { // Map image
          const mapName = this.match?.map;
          if (!mapName) {
            console.warn(`Map name not available in this.match for Rive asset '${asset.name}'. Cannot load.`);
            return false;
          }
          const url = `/assets/maps/${mapName}.jpg`;
          return loadAndDecodeImageHelper(asset, url, 1500, 1500);
        }

        if (asset.isImage && asset.name === "eventLogo") {
          let url = this.match?.tools?.tournamentInfo?.logoUrl && this.match.tools.tournamentInfo.logoUrl !== ""
              ? this.match.tools.tournamentInfo.logoUrl
              : "../../assets/misc/logo.webp"; 
          if (/^https?:\/\//.test(url) && !url.startsWith('/proxy-image')) url = `/proxy-image?url=${encodeURIComponent(url)}`;
          return loadAndDecodeImageHelper(asset, url, 1000, 1000);
        }

        if (asset.isFont) {
          let fontUrl = "";
          if (asset.name.includes("Noto Sans Mono") || asset.name.toLowerCase().includes("notosansmono")) {
            fontUrl = "/assets/fonts/NotoSansMono/NotoSansMono-Bold.ttf";
          }

          if (fontUrl) {
            try {
              const response = await fetch(fontUrl);
              if (!response.ok) {
                console.error(`Font fetch failed for ${asset.name} from ${fontUrl}: ${response.status}`);
                return false; 
              }
              const fontBuffer = await response.arrayBuffer();
              (asset as FontAsset).decode(new Uint8Array(fontBuffer));
              return true;
            } catch (e) {
              console.error(`Failed to load or decode font ${asset.name} from ${fontUrl}`, e);
              return false;
            }
          }
          console.warn(`Font asset '${asset.name}' not handled or font file path not found.`);
          return false;
        }

        if (asset.isImage && asset.name === "img_13") {
          const url = "/assets/agentSelect/img_13-3594105.png";
          return loadAndDecodeImageHelper(asset, url);
        }

        console.warn(`Asset '${asset.name}' (type: ${asset.constructor.name}) not handled by assetLoader.`);
        return false;
      },
      onLoad: () => {
        if (!this.riveInstance || !this.canvasElement) { // Check for canvasElement too
            console.error("Rive onLoad: Rive instance or canvasElement is null.");
            return;
        }
        const animInstance = this.riveInstance.viewModelInstance;
        const leftTeamColor = animInstance?.color('leftTeamSide');
        const rightTeamColor = animInstance?.color('rightTeamSide');

        if (this.match.teams?.[0]?.isAttacking) {
          if (leftTeamColor) {
            leftTeamColor.value = 0x80152D;
          }
        } else if (this.match.teams?.[1]?.isAttacking) {
          if (leftTeamColor) {
            leftTeamColor.value = 0x1C8C74;
          }
        }
        if (this.match.teams?.[1]?.isAttacking) {
          if (rightTeamColor) {
            rightTeamColor.value = 0x80152D;
          }
        } else if (this.match.teams?.[0]?.isAttacking) {
          if (rightTeamColor) {
            rightTeamColor.value = 0x1C8C74;
          }
        }
        console.log("Rive animation loaded. Setting initial texts.");
        this.updateRiveTextsAndInputs(); // Set initial texts and inputs

        // Make canvas visible *after* text is set
        this.canvasElement.style.visibility = 'visible';
        
        // Defer play to the next animation frame to ensure text is rendered
        requestAnimationFrame(() => {
            if (this.riveInstance) { // Re-check instance in case of component destruction
                console.log("Playing Rive animation in next frame.");
                this.riveInstance.play();
                this.riveInitialized = true; // Mark as initialized when play is actually called
            }
        });
      },
      onError: (error: any) => {
        console.error("Rive load error:", error);
        this.riveInitialized = false; 
        if (this.canvasElement) { // If canvas was created, ensure it's hidden on error too
            this.canvasElement.style.visibility = 'hidden';
        }
      }
    };
    this.riveInstance = new Rive(riveParams);
  }

  isAutoswitch(): boolean {
    return this.route.component === AutoswitchComponent;
  }

  shouldDisplay(): boolean {
    if (this.isAutoswitch()) {
      return this.match?.roundPhase === "LOBBY";
    }
    return true; // Default to true if not autoswitch or match data not yet available
  }

  trackByPlayerId(index: number, player: any) {
    return player.playerId;
  }

  ngOnDestroy() {
    this.riveInstance?.stop();
    // Rive's latest versions handle cleanup internally, but if you have an older version:
    // this.riveInstance?.cleanupInstances(); // or similar cleanup method
    this.riveInstance = null;
    this.riveInitialized = false;
    if (this.canvasElement) {
        this.canvasElement.remove(); // Clean up canvas from DOM
    }
  }
}
