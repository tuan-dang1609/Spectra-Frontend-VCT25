export class Config {
  serverEndpoint = "http://localhost:5200";
  redirectUrl = "https://valospectra.com";
  sponsorImageUrls: string[] = [];
  sponsorImageRotateSpeed = 5000; // in milliseconds

  attackerColorPrimary = "#E02853";
  attackerColorSecondary = "#ff4557";
  attackerColorShieldCurrency = "#ff838f";

  defenderColorPrimary = "#46F4CF";
  defenderColorSecondary = "#61eab6";
  defenderColorShieldCurrency = "#61eab6";

  public constructor(init?: Partial<Config>) {
    Object.assign(this, init);
  }
}
