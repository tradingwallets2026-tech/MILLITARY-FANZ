"use client";
import { useState, useTransition } from "react";
import { updateProfile } from "@/lib/actions";
import styles from "./settings.module.css";

interface SettingsFormProps {
  user: {
    id: string;
    email?: string;
    user_metadata?: { username?: string; full_name?: string };
  };
  profile: {
    username?: string;
    display_name?: string;
    bio?: string;
    website?: string;
  } | null;
}

export default function SettingsForm({ user, profile }: SettingsFormProps) {
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(user.id, {
        username:     fd.get("username")     as string,
        display_name: fd.get("display_name") as string,
        bio:          fd.get("bio")          as string,
        website:      fd.get("website")      as string,
      });
      if (result?.error) { setError(result.error); setSuccess(false); }
      else { setSuccess(true); setError(null); }
    });
  }

  const name = profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "";

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {success && (
        <div className={styles.successBox}>✅ Profile updated successfully.</div>
      )}
      {error && (
        <div className={styles.errorBox}>⚠️ {error}</div>
      )}

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Operator Callsign</label>
          <input name="username" defaultValue={profile?.username || user.user_metadata?.username || ""} className={styles.input} placeholder="ghost_operator" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Display Name</label>
          <input name="display_name" defaultValue={name} className={styles.input} placeholder="Commander Ghost" />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Email Address</label>
        <input value={user.email ?? ""} disabled className={`${styles.input} ${styles.inputDisabled}`} />
        <p className={styles.hint}>Email cannot be changed here.</p>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Bio</label>
        <textarea name="bio" defaultValue={profile?.bio ?? ""} className={styles.textarea} placeholder="Operator, streamer, tactical content creator..." rows={3} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Website / Social Link</label>
        <input name="website" defaultValue={profile?.website ?? ""} type="url" className={styles.input} placeholder="https://twitch.tv/yourname" />
      </div>

      <button type="submit" disabled={isPending} className={`btn btn-primary ${styles.saveBtn}`}>
        {isPending ? <span className={styles.spinner} /> : "💾 Save Changes"}
      </button>
    </form>
  );
}
