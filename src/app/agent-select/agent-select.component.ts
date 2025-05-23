import { AfterViewInit, Component, OnInit, ViewChild } from "@angular/core";
import { TrackerComponent } from "../tracker/tracker.component";
import { ActivatedRoute } from "@angular/router";
import { SocketService } from "../services/SocketService";
import { Config } from "../shared/config";
import { trigger, transition, style, animate } from "@angular/animations";
import { AutoswitchComponent } from "../autoswitch/autoswitch.component";
import {
  Rive,
  Fit,
  Alignment,
  Layout,
  decodeFont,
  ImageAsset,
  FontAsset,
  FileAsset,
  decodeImage,
} from "@rive-app/canvas";
import { AgentNameService } from "../services/agentName.service";
import { AgentRoleService } from "../services/agentRole.service";

@Component({
  selector: "app-agent-select",
  templateUrl: "./agent-select.component.html",
  styleUrls: ["./agent-select.component.scss"],
})
export class AgentSelectComponent implements OnInit, AfterViewInit {
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

  private riveInstance: any;

  constructor(private route: ActivatedRoute, private config: Config) {
    this.route.queryParams.subscribe((params) => {
      this.groupCode = params["groupCode"]?.toUpperCase() || "UNKNOWN";
    });
  }

  ngOnInit(): void {
    this.initMatch();
    this.socketService = SocketService.getInstance(
      this.config.serverEndpoint,
      this.groupCode
    );
    setTimeout(() => this.initRiveWithAgentAssets(), 0);
  }

  ngAfterViewInit(): void {
    this.socketService.subscribe((data: any) => {
      this.updateMatch(data);
    });
  }

  isAutoswitch(): boolean {
    return this.route.component === AutoswitchComponent;
  }

  shouldDisplay(): boolean {
    if (this.isAutoswitch()) {
      return this.match.roundPhase === "LOBBY";
    } else {
      return true;
    }
  }

  public updateMatch(data: any) {
    delete data.eventNumber;
    delete data.replayLog;
    this.match = data;

    this.team1Url = this.match.teams[0].teamUrl || "../../assets/misc/icon.webp";
    this.team2Url = this.match.teams[1].teamUrl || "../../assets/misc/icon.webp";

    this.teamLeft = this.match.teams[0];
    this.teamRight = this.match.teams[1];

    this.initRiveWithAgentAssets();
  }

  private initMatch(): void {
    this.match = {
      groupCode: "A",
      isRanked: false,
      isRunning: true,
      roundNumber: 0,
      roundPhase: "combat",
      teams: [
        { players: [], teamUrl: "", teamName: "", isAttacking: false },
        { players: [], teamUrl: "", teamName: "", isAttacking: false }
      ],
      spikeState: { planted: false },
      map: "Ascent",
      tools: {
        seriesInfo: {
          needed: 1,
          wonLeft: 0,
          wonRight: 0,
          mapInfo: [],
        },
      },
    };

    this.team1Url = this.match.teams[0].teamUrl || "../../assets/misc/icon.webp";
    this.team2Url = this.match.teams[1].teamUrl || "../../assets/misc/icon.webp";

    this.teamLeft = this.match.teams[0];
    this.teamRight = this.match.teams[1];
  }

  public initRiveWithAgentAssets(): void {
    const container = document.querySelector(".agent-select-animation");
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    if (container) {
      container.querySelectorAll("canvas").forEach((c) => c.remove());
      container.appendChild(canvas);
    } else {
      document.body.appendChild(canvas);
    }
    if (this.riveInstance?.viewModel) {
      this.riveInstance.viewModel.leftTeamSide = this.match.teams[0].isAttacking ? "#1C8C74" : "#80152D";
      this.riveInstance.viewModel.rightTeamSide = this.match.teams[1].isAttacking ? "#1C8C74" : "#80152D";
    }


    function loadAndDecodeImageSync(asset: FileAsset, url: string, targetWidth?: number, targetHeight?: number): boolean {
      try {
        if (targetWidth && targetHeight) {
          const img = new Image();
          img.src = url;
          if (!img.complete) {
            return false;
          }
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.clearRect(0, 0, targetWidth, targetHeight);
          const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
          const drawWidth = img.width * scale;
          const drawHeight = img.height * scale;
          const dx = (targetWidth - drawWidth) / 2;
          const dy = (targetHeight - drawHeight) / 2;
          ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

          const dataUrl = canvas.toDataURL("image/png");
          const binary = atob(dataUrl.split(",")[1]);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          (asset as ImageAsset).decode(bytes);
          return true;
        } else {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", url, false);
          xhr.overrideMimeType("text/plain; charset=x-user-defined");
          xhr.send();
          if (xhr.status === 200) {
            const binaryString = xhr.responseText;
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i) & 0xff;
            }
            (asset as ImageAsset).decode(bytes);
            return true;
          }
        }
      } catch (e) {
        console.warn("Failed to load image for", url, e);
      }
      return false;
    }

  const viewModel = {
    leftTeamSide: this.match.teams[0].isAttacking ? "#1C8C74" : "#80152D",
    rightTeamSide: this.match.teams[1].isAttacking ? "#1C8C74" : "#80152D"
  };


    const allPlayers = [
      ...this.match.teams[0].players,
      ...this.match.teams[1].players,
    ];

    this.riveInstance = new Rive({
      src: "/assets/agentSelect/agent_select.riv",
      canvas,
      autoplay: true,
      assetLoader: (asset, bytes) => {
        const imageMatch = asset.name.match(/^([LR])(\d+)_agent$|^([LR])(\d+)_role$/i);
        if (asset.isImage && imageMatch) {
          // Determine side and index
          const side = imageMatch[1] || imageMatch[3]; // 'L' or 'R'
          const idx = parseInt(imageMatch[2] || imageMatch[4], 10) - 1;
          let player;
          if (side === "L") {
            player = this.match.teams[0].players[idx];
          } else if (side === "R") {
            player = this.match.teams[1].players[idx];
          }
          if (player?.agentInternal) {
            if (asset.name.includes("agent")) {
              const url = `/assets/agent-portraits/${player.agentInternal}Portrait.webp`;
              return loadAndDecodeImageSync(asset, url);
            } else {
              const role = AgentRoleService.getAgentRole(player.agentInternal);
              const url = `/assets/roles/${role}.webp`;
              return loadAndDecodeImageSync(asset, url);
            }
          }
          return false;
        }

        if (asset.isImage && asset.name === "leftTeamLogo") {
          const url = this.match.teams[0].teamUrl || "../../assets/misc/icon.webp";
          return loadAndDecodeImageSync(asset, url, 2500, 2500);
        }
        if (asset.isImage && asset.name === "rightTeamLogo") {
          const url = this.match.teams[1].teamUrl || "../../assets/misc/icon.webp";
          return loadAndDecodeImageSync(asset, url, 2500, 2500);
        }

        // Add this block for the map image
        if (asset.isImage && asset.name === "img_14") {
          // Ensure the map name matches the file name (case sensitive, extension .jpg)
          const mapName = this.match.map;
          const url = `/assets/maps/${mapName}.jpg`;
          // Adjust target size as needed (example: 512x288)
          return loadAndDecodeImageSync(asset, url, 1500, 1500);
        }

        if (asset.isImage && asset.name === "eventLogo") {
          const url =
            this.match.tools?.tournamentInfo?.logoUrl && this.match.tools.tournamentInfo.logoUrl !== ""
              ? this.match.tools.tournamentInfo.logoUrl
              : "../../assets/misc/logo.webp";
          // Adjust size as needed for your animation mask
          return loadAndDecodeImageSync(asset, url, 2000, 2000);
        }

        return false;
      },
      onLoad: () => {
        const leftTeamSide = this.match.teams[0].isAttacking ? "ATK" : "DEF";
        const rightTeamSide = this.match.teams[1].isAttacking ? "ATK" : "DEF";
        this.riveInstance.setTextRunValue("leftTeamName", this.match.teams[0].teamName?.toUpperCase() || "");
        this.riveInstance.setTextRunValue("leftTeamSide", leftTeamSide);
        this.riveInstance.setTextRunValue("rightTeamName", this.match.teams[1].teamName?.toUpperCase() || "");
        this.riveInstance.setTextRunValue("rightTeamSide", rightTeamSide);
        this.riveInstance.setTextRunValue("mapName", this.match.map?.toUpperCase() || "");
        this.riveInstance.setTextRunValue("mapNum", "MAP " + this.match.tools.seriesInfo.mapInfo.length.toString());

        // Use actual team arrays for each side
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

        const anyNameTooLong = [...leftPlayers, ...rightPlayers].some(p => p && p.name && p.name.length > 9);

        this.riveInstance.play(anyNameTooLong ? "Anim_Small" : "Anim_Regular");
      },
    });
  }

  trackByPlayerId(index: number, player: any) {
    return player.playerId;
  }
}
