import { redirect } from "next/navigation";

export default function LogoutPage() {
  redirect("/api/demo-wallet/logout");
}
