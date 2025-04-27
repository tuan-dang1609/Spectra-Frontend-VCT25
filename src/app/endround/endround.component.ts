import { Component, Input, OnChanges, SimpleChanges, OnInit, AfterViewChecked } from "@angular/core";
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
import { Image } from "@rive-app/canvas/rive_advanced.mjs";

@Component({
  selector: "app-endround",
  templateUrl: "./endround.component.html",
  styleUrls: ["./endround.component.scss"],
})
export class EndroundComponent implements OnChanges, OnInit, AfterViewChecked {
  @Input() match!: any;
  tournamentUrl = "../../assets/misc/logo_endround.webp";
  tournamentBackgroundUrl = "../../assets/misc/backdrop.png";
  teamWonLogoUrl = "../../assets/misc/icon_endround.webp";

  // Add separate size variables for each asset
  private readonly tournamentBackgroundWidth = 830;
  private readonly tournamentBackgroundHeight = 250;
  private readonly tournamentLogoWidth = 1400;
  private readonly tournamentLogoHeight = 1400;
  private readonly teamWonLogoWidth = 3600;
  private readonly teamWonLogoHeight = 3600;

  endRoundEnabled = false;
  teamWon = 0;
  private scoreboardCanvas!: HTMLCanvasElement | null;
  private canvasInitialized = false;
  private riveInstance!: Rive;
  private previousRoundPhase: string | null = null;
  private readonly desiredImageWidth = 512; // <-- SET your fixed width
  private readonly desiredImageHeight = 512; // <-- SET your fixed height

  ngOnInit(): void {
    this.endRoundEnabled = this.match?.tools?.tournamentInfo?.enabled || false;
    if (!this.endRoundEnabled) return;

    this.tournamentUrl =
      this.match?.tools?.tournamentInfo?.logoUrl && this.match.tools.tournamentInfo.logoUrl !== ""
        ? this.match.tools.tournamentInfo.logoUrl
        : "../../assets/misc/logo_endround.webp";

    this.tournamentBackgroundUrl =
      this.match?.tools?.tournamentInfo?.backdropUrl &&
      this.match.tools.tournamentInfo.backdropUrl !== ""
        ? this.match.tools.tournamentInfo.backdropUrl
        : "../../assets/misc/backdrop.png";
    // Preload the Rive animation
    this.preloadRiveAnimation();

    // Initialize previousRoundPhase to the current phase if available
    this.previousRoundPhase = this.match?.roundPhase ?? null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["match"]) {
      const match = changes["match"].currentValue;

      if (match) {
        console.log("Match data:", match);

        if (match.attackersWon) {
          this.teamWon = match.teams[0].isAttacking ? 0 : 1;
        } else {
          this.teamWon = match.teams[0].isAttacking ? 1 : 0;
        }

        // Update the teamWonLogoUrl after teamWon is set
        this.teamWonLogoUrl =
          match.teams?.[this.teamWon]?.teamUrl && match.teams[this.teamWon].teamUrl !== ""
            ? match.teams[this.teamWon].teamUrl
            : "../../assets/misc/icon_endround.webp";

        // Only reset canvasInitialized if roundPhase transitions to "end"
        if (
          (this.previousRoundPhase !== "end" && match.roundPhase === "end") ||
          (this.previousRoundPhase === null && match.roundPhase === "end")
        ) {
          this.canvasInitialized = false;
        }
        this.previousRoundPhase = match.roundPhase;
      }
    }
  }

  ngAfterViewChecked(): void {
    if (!this.canvasInitialized && this.endRoundEnabled && this.match?.roundPhase === "end") {
      if (this.initializeScoreboardCanvas()) {
        this.scoreboardAnim();
      }
    }
  }

  private initializeScoreboardCanvas(): boolean {
    if (!this.scoreboardCanvas) {
      this.scoreboardCanvas = document.getElementById("scoreboardCanvas") as HTMLCanvasElement;

      if (!this.scoreboardCanvas) {
        console.error("Scoreboard canvas not found in the DOM.");
        return false;
      }
    }
    return true;
  }

  private preloadRiveAnimation(): void {
    // Create a temporary canvas for preloading
    const tempCanvas = document.createElement("canvas");

    this.riveInstance = new Rive({
      src: "/assets/roundEnd/round_win.riv",
      canvas: tempCanvas, // Use the temporary canvas
      autoplay: true, // Do not autoplay during preload
      onLoad: () => {
        console.log("Rive animation preloaded successfully.");
      },
    });
  }

  private async resizeAndFetchImage(url: string, desiredWidth: number, desiredHeight: number): Promise<Uint8Array> {
    const img: HTMLImageElement = document.createElement('img');
    img.crossOrigin = "anonymous" as const;
    img.src = url;
    await img.decode();
  
    const canvas = document.createElement('canvas');
    canvas.width = desiredWidth;
    canvas.height = desiredHeight;
    const ctx = canvas.getContext('2d')!;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate the scaling factor to fit the image inside the box
    const scale = Math.min(desiredWidth / img.width, desiredHeight / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    // Center the image inside the canvas
    const dx = (desiredWidth - drawWidth) / 2;
    const dy = (desiredHeight - drawHeight) / 2;

    ctx.drawImage(
      img,
      dx,
      dy,
      drawWidth,
      drawHeight
    );

  
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas toBlob() returned null."));
        }
      }, "image/png");
    });
  
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
  
  
  private backdropAsset = async (asset: ImageAsset) => {
    const bytes = await this.resizeAndFetchImage(
      this.tournamentBackgroundUrl,
      this.tournamentBackgroundWidth,
      this.tournamentBackgroundHeight
    );
    asset.decode(bytes);
  };

  private tournamentLogoAsset = async (asset: ImageAsset) => {
    const bytes = await this.resizeAndFetchImage(
      this.tournamentUrl,
      this.tournamentLogoWidth,
      this.tournamentLogoHeight
    );
    asset.decode(bytes);
  };

  private teamLogoAsset = async (asset: ImageAsset) => {
    const bytes = await this.resizeAndFetchImage(
      this.teamWonLogoUrl,
      this.teamWonLogoWidth,
      this.teamWonLogoHeight
    );
    asset.decode(bytes);
  };

  public scoreboardAnim(): void {
    if (this.canvasInitialized) {
      console.warn("Rive animation is already initialized.");
      return;
    }

    if (!this.initializeScoreboardCanvas()) {
      console.error("Cannot initialize Rive animation because the canvas is not available.");
      return;
    }

    // Ensure `this.scoreboardCanvas` is not null
    if (!this.scoreboardCanvas) {
      console.error("Scoreboard canvas is null after initialization.");
      return;
    }
    // Reinitialize the Rive instance with the actual canvas
    this.riveInstance = new Rive({
      src: "/assets/roundEnd/round_win.riv",
      canvas: this.scoreboardCanvas, // Use the actual canvas
      autoplay: true,
      assetLoader: (asset, bytes) => {
        console.log("Asset information: ", {
          name: asset.name,
          fileExtension: asset.fileExtension,
          cdnUuid: asset.cdnUuid,
          isFont: asset.isFont,
          isImage: asset.isImage,
          bytes,
        });
        if (asset.cdnUuid.length > 0 || bytes.length > 0) {
          return false
        }

        if (asset.isImage && asset.name === "tournamentBackdrop") {
          this.backdropAsset(asset as ImageAsset);
          return true;
        } else if (asset.isImage && asset.name === "tournamentLogo") {
          this.tournamentLogoAsset(asset as ImageAsset);
          return true;
        } else if (asset.isImage && asset.name === "icon") {
          this.teamLogoAsset(asset as ImageAsset);
          return true;
        } else {
          return false;
        }
      },
      onLoad: () => {
        console.log("Rive animation loaded successfully.");
        this.riveInstance.resizeDrawingSurfaceToCanvas();

        if (this.match) {
          const winningTeam = this.match.teams[this.teamWon];
          const sideText = winningTeam.isAttacking ? "ATTACK" : "DEFENSE";
          this.riveInstance.setTextRunValue("sideRun", sideText);
          this.riveInstance.setTextRunValue("roundRun", "ROUND " + this.match.roundNumber.toString());
        }

        this.riveInstance.play();
      }
    });
    this.canvasInitialized = true;
  }
}
