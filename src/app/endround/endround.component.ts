import { Component, Input, OnChanges, SimpleChanges, OnInit, AfterViewChecked } from "@angular/core";
import { Rive } from "@rive-app/canvas";

@Component({
  selector: "app-endround",
  templateUrl: "./endround.component.html",
  styleUrls: ["./endround.component.scss"],
})
export class EndroundComponent implements OnChanges, OnInit, AfterViewChecked {
  @Input() match!: any;
  tournamentUrl = "../../assets/misc/logo.webp";
  tournamentBackgroundUrl = "../../assets/misc/backdrop.webp";
  endRoundEnabled = false;
  teamWon = 0;
  private scoreboardCanvas!: HTMLCanvasElement | null;
  private canvasInitialized = false;
  private riveInstance!: Rive;

  ngOnInit(): void {
    this.endRoundEnabled = this.match?.tools?.tournamentInfo?.enabled || false;
    if (!this.endRoundEnabled) return;

    this.tournamentUrl =
      this.match?.tools?.tournamentInfo?.logoUrl && this.match.tools.tournamentInfo.logoUrl !== ""
        ? this.match.tools.tournamentInfo.logoUrl
        : "../../assets/misc/logo.webp";

    this.tournamentBackgroundUrl =
      this.match?.tools?.tournamentInfo?.backdropUrl &&
      this.match.tools.tournamentInfo.backdropUrl !== ""
        ? this.match.tools.tournamentInfo.backdropUrl
        : "../../assets/misc/backdrop.png";

    this.preloadImage(this.tournamentUrl);
    this.preloadImage(this.tournamentBackgroundUrl);

    // Preload the Rive animation
    this.preloadRiveAnimation();
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

        // Reset canvasInitialized when a new round ends
        if (match.roundPhase === "end") {
          this.canvasInitialized = false;

          if (this.initializeScoreboardCanvas()) {
            this.scoreboardAnim();
          }
        }
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

  private preloadImage(url: string): void {
    const img = new Image();
    img.src = url;
  }

  private preloadRiveAnimation(): void {
    // Create a temporary canvas for preloading
    const tempCanvas = document.createElement("canvas");

    this.riveInstance = new Rive({
      src: "/assets/roundEnd/round_win.riv",
      canvas: tempCanvas, // Use the temporary canvas
      autoplay: false, // Do not autoplay during preload
      onLoad: () => {
        console.log("Rive animation preloaded successfully.");
      },
      assetLoader: (asset: any, bytes: Uint8Array) => {
        try {
          if (asset.name === "tournamentLogo") {
            const img = new Image();
            img.src = this.tournamentUrl;
            img.onload = () => {
              asset.decode(img);
            };
            img.onerror = () => {
              console.error("Failed to load tournament logo:", this.tournamentUrl);
            };
            return true;
          } else if (asset.name === "tournamentBackdrop") {
            const img = new Image();
            img.src = this.tournamentBackgroundUrl;
            img.onload = () => {
              asset.decode(img);
            };
            img.onerror = () => {
              console.error("Failed to load tournament backdrop:", this.tournamentBackgroundUrl);
            };
            return true;
          }
        } catch (error) {
          console.error("Error in assetLoader during preload:", error);
        }
        return false;
      },
    });
  }

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
      onLoad: () => {
        console.log("Rive animation loaded successfully.");
        this.riveInstance.resizeDrawingSurfaceToCanvas();

        if (this.match) {
          if (this.teamWon === 0) {
            this.riveInstance.setTextRunValue("sideRun", "ATTACK");
          } else {
            this.riveInstance.setTextRunValue("sideRun", "DEFENSE");
          }
          this.riveInstance.setTextRunValue("roundRun", "ROUND " + this.match.roundNumber.toString());
        }

        this.riveInstance.play();
      },
      assetLoader: (asset: any, bytes: Uint8Array) => {
        try {
          if (asset.name === "tournamentLogo") {
            const img = new Image();
            img.src = this.tournamentUrl;
            img.onload = () => {
              asset.decode(img);
            };
            img.onerror = () => {
              console.error("Failed to load tournament logo:", this.tournamentUrl);
            };
            return true;
          } else if (asset.name === "tournamentBackdrop") {
            const img = new Image();
            img.src = this.tournamentBackgroundUrl;
            img.onload = () => {
              asset.decode(img);
            };
            img.onerror = () => {
              console.error("Failed to load tournament backdrop:", this.tournamentBackgroundUrl);
            };
            return true;
          }
        } catch (error) {
          console.error("Error in assetLoader during preload:", error);
        }
        return false;
      },
    });

    this.canvasInitialized = true;
  }
}
