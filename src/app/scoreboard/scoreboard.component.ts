import { Component, Input } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

@Component({
  selector: "app-scoreboard",
  templateUrl: "./scoreboard.component.html",
  styleUrls: ["./scoreboard.component.scss"],
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
