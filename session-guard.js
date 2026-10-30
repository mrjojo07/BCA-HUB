import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";

const supabase = createClient(
  "https://efbkhmfekfujbwfdpfhk.supabase.co",
  "sb_publishable_N62MLBZ5CQ7016suLKhOmg_wpuQYSbH"
);

const { data, error } = await supabase.auth.getSession();

if (error || !data?.session?.user) {
  window.location.replace("login.html");
} else {
  document.documentElement.style.visibility = "visible";
}
