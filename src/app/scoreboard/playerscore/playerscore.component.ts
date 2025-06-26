import { Component, Input } from "@angular/core";
import { AgentNameService } from "../../services/agentName.service";
import { AgentRoleService } from "../../services/agentRole.service";

@Component({
    selector: "app-playerscore",
    templateUrl: "./playerscore.component.html",
    styleUrls: ["./playerscore.component.scss"],
    standalone: false
})
export class PlayerscoreComponent {
  public readonly assets: string = "../../../assets";

  @Input() match!: any;
  @Input() player!: any;
  @Input() color!: "attacker" | "defender";
  @Input() side!: "left" | "right";
  @Input() hideAuxiliary = false;
  @Input() shiftUltimate = false;

  get showAssistCounts() {
    return this.match.teams.findIndex((e: any) => e.hasDuplicateAgents) == -1;
  }

  numSequence(n: number): number[] {
    return Array(n);
  }

  getAgentName(agent: string): string {
    return AgentNameService.getAgentName(agent);
  }

  getAgentRole(agent: string): string {
    return AgentRoleService.getAgentRole(agent);
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
}

@Component({
    selector: "app-playerscore-minimal",
    templateUrl: "./playerscore-minimal.component.html",
    styleUrls: ["./playerscore.component.scss"],
    standalone: false
})
export class PlayerscoreMinimalComponent extends PlayerscoreComponent {}
