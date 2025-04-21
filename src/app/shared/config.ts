export class Config {
  serverEndpoint = "http://localhost:5200";
  redirectUrl = "https://valospectra.com";
  sponsorImageUrls: string[] = [];
  sponsorImageRotateSpeed = 5000; // in milliseconds

  attackerColorPrimary = "#E02853";
  attackerColorSecondary = "#E02853";
  attackerColorShieldCurrency = "#E02853";

  defenderColorPrimary = "#46F4CF";
  defenderColorSecondary = "#46F4CF";
  defenderColorShieldCurrency = "#46F4CF";

  public constructor(init?: Partial<Config>) {
    Object.assign(this, init);
  }
}
