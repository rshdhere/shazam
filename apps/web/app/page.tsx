import { LookupForm } from "./lookup-form";
import { RecentLookups } from "./recent-lookups";
import styles from "./ui.module.css";

export default function Home() {
  return (
    <main className={styles.shell}>
      <h1 className={styles.hero}>What&rsquo;s that song?</h1>
      <p className={styles.lede}>
        Paste a link to a post from Instagram, X, YouTube, Pinterest or TikTok.
        We&rsquo;ll listen to it and name the songs that play.
      </p>
      <LookupForm />
      <RecentLookups />
    </main>
  );
}
