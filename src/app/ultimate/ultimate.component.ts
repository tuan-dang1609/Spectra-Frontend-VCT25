import { Config } from "../shared/config";
import { Component, Input, AfterViewInit, OnChanges } from "@angular/core";

@Component({
  selector: "app-ultimate",
  templateUrl: "./ultimate.component.html",
  styleUrls: ["./ultimate.component.scss"],
})
export class UltimateComponent implements AfterViewInit, OnChanges {
  public readonly assets: string = "../../../assets";

  private _player: any;
  @Input()
  set player(val: any) {
    this._player = val;
    this.updateUltimateProgress();
  }
  get player() {
    return this._player;
  }

  @Input() color!: "attacker" | "defender";
  @Input() match!: any;
  @Input() hideAuxiliary = false;

  private svgContainer!: SVGSVGElement;

  constructor(private config: Config) {}

  ngAfterViewInit(): void {
    // Query after the view is initialized
    this.svgContainer = document.querySelector(".ultimate-dashed-circle") as SVGSVGElement;
    this.updateUltimateProgress();
  }

  ngOnChanges(): void {
    this.updateUltimateProgress();
  }

  private createDash(
    cx: number,
    cy: number,
    outerRadius: number,
    angle: number,
    originalSpan: number,
    collected: boolean,
    isAttacking: boolean
  ) {
    const dashCoverage = 0.8;
    const adjustedSpan = originalSpan * dashCoverage;
    const startAngle = angle - adjustedSpan / 2;
    const endAngle = angle + adjustedSpan / 2;
    const startX = cx + outerRadius * Math.cos(startAngle);
    const startY = cy + outerRadius * Math.sin(startAngle);
    const endX = cx + outerRadius * Math.cos(endAngle);
    const endY = cy + outerRadius * Math.sin(endAngle);
    const largeArcFlag = 0;
    const sweepFlag = 1;

    const pathData = `
      M ${startX} ${startY}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}
    `.trim();

    const dash = document.createElementNS("http://www.w3.org/2000/svg", "path");
    dash.setAttribute("d", pathData);
    dash.setAttribute(
      "stroke",
      collected
        ? isAttacking
          ? this.config.attackerColorPrimary
          : this.config.defenderColorPrimary
        : "rgba(163, 163, 163, 0.5)"
    );
    dash.setAttribute("stroke-width", "3");
    dash.setAttribute("fill", "none");
    dash.setAttribute("stroke-linecap", "butt");

    this.svgContainer.appendChild(dash);
  }

  private updateUltimateProgress(): void {
    if (!this.svgContainer) {
      return;
    }
    this.svgContainer.innerHTML = "";
    const cx = 40, cy = 40, outerRadius = 18;

    if (this.player.currUltPoints === this.player.maxUltPoints) {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      filter.setAttribute("id", "glow");
      filter.setAttribute("x", "-50%");
      filter.setAttribute("y", "-50%");
      filter.setAttribute("width", "200%");
      filter.setAttribute("height", "200%");

      const feDropShadow = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
      feDropShadow.setAttribute("dx", "0");
      feDropShadow.setAttribute("dy", "0");
      feDropShadow.setAttribute("stdDeviation", "3");
      feDropShadow.setAttribute("flood-color", "white");
      feDropShadow.setAttribute("flood-opacity", "1");

      const animate = document.createElementNS("http://www.w3.org/2000/svg", "animate");
      animate.setAttribute("attributeName", "stdDeviation");
      animate.setAttribute("values", "3;8;8;3");
      animate.setAttribute("keyTimes", "0;0.4;0.5;1");
      animate.setAttribute("calcMode", "spline");
      animate.setAttribute("keySplines", "0.42 0 0.58 1; 0 0 1 1; 0.42 0 0.58 1");
      animate.setAttribute("dur", "5s");
      animate.setAttribute("repeatCount", "indefinite");

      feDropShadow.appendChild(animate);
      filter.appendChild(feDropShadow);
      defs.appendChild(filter);
      this.svgContainer.appendChild(defs);

      const glowingCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      glowingCircle.setAttribute("cx", cx.toString());
      glowingCircle.setAttribute("cy", cy.toString());
      glowingCircle.setAttribute("r", outerRadius.toString());
      glowingCircle.setAttribute("stroke", "white");
      glowingCircle.setAttribute("stroke-width", "2");
      glowingCircle.setAttribute("fill", "none");
      glowingCircle.setAttribute("filter", "url(#glow)");

      this.svgContainer.appendChild(glowingCircle);
    } else {
      const dashSpan = (2 * Math.PI) / this.player.maxUltPoints;
      const isAttacking = this.match?.teams?.[ this.player.teamIndex ]?.isAttacking ?? false;
      for (let i = 0; i < this.player.maxUltPoints; i++) {
        const angle = i * dashSpan - Math.PI / 2 + dashSpan / 2;
        this.createDash(
          cx,
          cy,
          outerRadius,
          angle,
          dashSpan,
          i < this.player.currUltPoints,
          isAttacking
        );
      }
    }
  }
}
