import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from "@angular/core";
import { animate, style, transition, trigger } from "@angular/animations";
import { Config } from "../../shared/config";

@Component({
  selector: "app-topinfo",
  templateUrl: "./topinfo.component.html",
  styleUrls: ["./topinfo.component.scss"],
  animations: [
    trigger("fadeInOut", [
      transition(":enter", [style({ opacity: 0 }), animate("1s", style({ opacity: 1 }))]),
      transition(":leave", [animate("1s", style({ opacity: 0 }))]),
    ]),
    trigger("fadeCycle", [
      transition(":enter", [
        style({ opacity: 0, position: "absolute", width: "100%", textAlign: "center" }),
        animate("600ms ease-in-out", style({ opacity: 1 })),
      ]),
      transition(":leave", [
        style({ opacity: 1, position: "absolute", width: "100%", textAlign: "center" }),
        animate("600ms ease-in-out", style({ opacity: 0 })),
      ]),
    ]),
  ],
})
export class TopinfoComponent implements OnInit, OnDestroy, OnChanges {
  @Input() match!: any;

  sponsorsAvailable = false;
  sponsorImages: string[] = [];
  currentSponsorIndex = 0;
  showEventName!: boolean;
  eventName!: string;

  displayAttributionContent = false;
  private attributionIntervalId: any;
  private sponsorIntervalId: any; // Added for sponsor cycling

  constructor(private config: Config) {}

  ngOnInit() {
    this.showEventName = this.config.showEventName;
    this.eventName = this.config.eventName;

    // Initialize sponsors from config as a baseline
    this.sponsorImages = this.config.sponsorImageUrls;
    this.sponsorsAvailable = this.sponsorImages.length > 0;
    this.currentSponsorIndex = 0;
    this.startSponsorCycle(); // Start sponsor cycle with config settings

    if (this.showEventName) {
      this.startAttributionCycle(); // Assuming this method is correctly defined
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["match"] && changes["match"].currentValue) {
      const currentMatch = changes["match"].currentValue;
      const sponsorInfo = currentMatch.tools?.sponsorInfo;

      // Determine which sponsors to use: from match data or fallback to config
      if (sponsorInfo !== undefined) {
        // sponsorInfo object is present in match.tools
        if (sponsorInfo.enabled && sponsorInfo.sponsors?.length) {
          // Use sponsors from match data
          this.sponsorImages = sponsorInfo.sponsors;
          this.sponsorsAvailable = true;
        } else {
          // sponsorInfo is present but disabled or has no sponsors, so no sponsors shown
          this.sponsorsAvailable = false;
          this.sponsorImages = [];
        }
      } else {
        // sponsorInfo object is NOT present in match.tools, so use config sponsors
        this.sponsorImages = this.config.sponsorImageUrls;
        this.sponsorsAvailable = this.sponsorImages.length > 0;
      }
      this.currentSponsorIndex = 0; // Reset index when sponsor source might change

      // Restart the sponsor cycle with the potentially new set of sponsors and speed
      this.startSponsorCycle();
    }
  }

  ngOnDestroy(): void {
    this.clearAttributionInterval();
    this.clearSponsorInterval();
  }

  private startSponsorCycle(): void {
    this.clearSponsorInterval(); // Always clear any existing interval

    if (this.sponsorsAvailable && this.sponsorImages.length > 1) {
      let rotateSpeed = this.config.sponsorImageRotateSpeed; // Default speed from config

      // If current sponsors are from match data and match data provides a duration
      if (
        this.match?.tools?.sponsorInfo?.enabled &&
        this.match.tools.sponsorInfo.sponsors === this.sponsorImages && // Check if current images are from match
        this.match.tools.sponsorInfo.duration > 0
      ) {
        rotateSpeed = this.match.tools.sponsorInfo.duration;
      }

      this.sponsorIntervalId = setInterval(() => {
        this.nextSponsor();
      }, rotateSpeed);
    }
  }

  private clearSponsorInterval(): void {
    if (this.sponsorIntervalId) {
      clearInterval(this.sponsorIntervalId);
      this.sponsorIntervalId = null;
    }
  }

  nextSponsor() {
    if (this.sponsorImages.length > 0) {
      // Guard against operating on an empty array
      this.currentSponsorIndex = (this.currentSponsorIndex + 1) % this.sponsorImages.length;
    }
  }

  mapInfoForSlot(slot: number) {
    // Added optional chaining for safety
    return this.match?.tools?.seriesInfo?.mapInfo[slot] || {};
  }

  isDeciderForSlot(slot: number) {
    // Placeholder for actual logic if needed
    return false;
  }

  // Assuming attribution cycle methods are defined as they were from previous context
  private startAttributionCycle(): void {
    this.clearAttributionInterval();
    // Ensure displayAttributionContent is initialized if necessary
    this.attributionIntervalId = setInterval(() => {
      this.displayAttributionContent = !this.displayAttributionContent;
    }, 8000); // Cycle every 8 seconds, adjust as needed
  }

  private clearAttributionInterval(): void {
    if (this.attributionIntervalId) {
      clearInterval(this.attributionIntervalId);
      this.attributionIntervalId = null;
    }
  }
}

interface SponsorInfo {
  enabled: boolean;
  duration: number; // This is the rotation speed for sponsors from match data
  sponsors: string[];
}
