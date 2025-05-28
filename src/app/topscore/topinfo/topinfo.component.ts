import { animate, style, transition, trigger } from "@angular/animations";
import { Component, Input, OnInit, OnDestroy } from "@angular/core";
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
export class TopinfoComponent implements OnInit, OnDestroy {
  @Input() match!: any;

  sponsorsAvailable = false;
  sponsorImages: string[] = [];
  currentSponsorIndex = 0;
  showEventName!: boolean;
  eventName!: string;

  displayAttributionContent = false;
  private attributionIntervalId: any;

  constructor(private config: Config) {}

  ngOnInit() {
    this.showEventName = this.config.showEventName;
    this.eventName = this.config.eventName;
    this.sponsorsAvailable = this.config.sponsorImageUrls.length > 0;
    if (this.sponsorsAvailable) {
      this.sponsorImages = this.config.sponsorImageUrls;
      this.currentSponsorIndex = 0;
      if (this.config.sponsorImageUrls.length > 1) {
        setInterval(() => this.nextSponsor(), this.config.sponsorImageRotateSpeed);
      }
    }

    if (this.showEventName) {
      this.startAttributionCycle();
    }
  }

  ngOnDestroy() {
    this.clearAttributionInterval();
  }

  private startAttributionCycle(): void {
    this.clearAttributionInterval();
    this.displayAttributionContent = false;
    this.attributionIntervalId = setInterval(() => {
      this.displayAttributionContent = !this.displayAttributionContent;
    }, 8000);
  }

  private clearAttributionInterval(): void {
    if (this.attributionIntervalId) {
      clearInterval(this.attributionIntervalId);
      this.attributionIntervalId = null;
    }
  }

  nextSponsor() {
    this.currentSponsorIndex = (this.currentSponsorIndex + 1) % this.config.sponsorImageUrls.length;
  }

  mapInfoForSlot(slot: number) {
    return this.match.tools.seriesInfo.mapInfo[slot] || {};
  }

  isDeciderForSlot(slot: number) {
    return false;
  }
}
