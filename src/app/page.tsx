import { redirect } from "next/navigation";

// The room lives at /tenant; / is just an entry point.
export default function Home() {
  redirect("/tenant");
}
