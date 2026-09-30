export type RegisteredVpnNode = {
  id: string;
  name: string;
  status: "SETUP_REQUIRED" | "CONNECTED";
  createdAt: string;
};
