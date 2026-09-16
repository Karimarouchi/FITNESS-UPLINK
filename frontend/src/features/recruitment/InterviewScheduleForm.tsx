import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

export type InterviewDraft = {
  interviewAt: string;
  interviewMode: "MEET" | "ONSITE";
  interviewPlace: string;
};

export function InterviewScheduleForm({
  candidateName,
  onCancel,
  onConfirm,
}: {
  candidateName: string;
  onCancel: () => void;
  onConfirm: (draft: InterviewDraft) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [mode, setMode] = useState<"MEET" | "ONSITE">("MEET");
  const [place, setPlace] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!date || !time || !place.trim()) {
      return;
    }
    onConfirm({
      interviewAt: `${date}T${time}`,
      interviewMode: mode,
      interviewPlace: place.trim(),
    });
  }

  return (
    <form className="hire-interview" onSubmit={submit}>
      <h3>Entretien avec {candidateName}</h3>
      <p>Choisissez la date, l’heure et le lieu. Un e-mail partira au candidat.</p>
      <div className="mail-fields">
        <div className="field">
          <label htmlFor="interview-date">Date</label>
          <input id="interview-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="interview-time">Heure</label>
          <input id="interview-time" type="time" required value={time} onChange={(event) => setTime(event.target.value)} />
        </div>
        <div className="field field--full">
          <label htmlFor="interview-mode">Mode</label>
          <select id="interview-mode" value={mode} onChange={(event) => setMode(event.target.value as "MEET" | "ONSITE")}>
            <option value="MEET">Visioconférence</option>
            <option value="ONSITE">Présentiel</option>
          </select>
        </div>
        <div className="field field--full">
          <label htmlFor="interview-place">{mode === "MEET" ? "Lien Meet / Zoom" : "Adresse"}</label>
          <input
            id="interview-place"
            required
            value={place}
            placeholder={mode === "MEET" ? "https://meet.google.com/…" : "Adresse du lieu"}
            onChange={(event) => setPlace(event.target.value)}
          />
        </div>
      </div>
      <div className="settings-mail-actions">
        <Button variant="outline" type="button" onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="primary" type="submit">
          Envoyer la convocation
        </Button>
      </div>
    </form>
  );
}
