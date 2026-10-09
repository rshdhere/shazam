import { LookupForm } from "./lookup-form";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <h1>What song is this?</h1>
      <LookupForm />
    </div>
  );
}
