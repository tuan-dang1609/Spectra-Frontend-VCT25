import { Component, Input } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: "app-scoreboard",
  templateUrl: "./scoreboard.component.html",
  styleUrls: ["./scoreboard.component.scss"],
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('400ms cubic-bezier(0.4,0,0.2,1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('400ms cubic-bezier(0.4,0,0.2,1)', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class ScoreboardComponent {
  @Input() match!: any;
  @Input() player!: any;
  @Input() hideAuxiliary = false;

  constructor(private route: ActivatedRoute) {}

  isMinimal(): boolean {
    if (this.route.snapshot.data["minimal"]) {
      return this.route.snapshot.data["minimal"];
    } else {
      return false;
    }
  }

  get showAuxScoreboard(): boolean {
    // Returns true if at least one player has auxiliary abilities and hideAuxiliary is false
    return (
      !this.hideAuxiliary &&
      (
        this.match.teams[0].players.some((p: any) => p.auxiliaryAvailable?.abilities) ||
        this.match.teams[1].players.some((p: any) => p.auxiliaryAvailable?.abilities)
      )
    );
  }

  trackByPlayerId(index: number, player: any) {
    return player.playerId;
  }

  numSequence(n: number): number[] {
    return Array(n);
  }
}
