import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import { ApiError } from "@/shared/api/client";
import { fetchCountries } from "@/features/onboarding/api";
import type { CountrySummary } from "@/features/auth/types";
import {
  createQuoteRequest,
  fetchProviderProfile,
  providerLocation,
  uploadQuoteAttachment,
  type ProviderProfile,
} from "../api";
import { ProviderLogo } from "../ProviderLogo";

const ease = [0.16, 1, 0.3, 1] as const;

export function ProviderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchProviderProfile(id).then(setProfile).catch(() => setError("Prestataire introuvable."));
  }, [id]);

  if (error) {
    return (
      <section>
        <p className="jobs-empty">
          <strong>{error}</strong>
        </p>
      </section>
    );
  }
  if (!profile || !id) {
    return null;
  }

  const place = providerLocation(profile);

  return (
    <section>
      <motion.div className="profile-banner" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <ProviderLogo providerId={profile.id} uploadId={profile.logoUploadId} name={profile.displayName} size={88} />
        <div>
          <div className="pn">{profile.displayName}</div>
          {profile.subscribed ? <Badge>Abonné</Badge> : null}
          <div className="ploc">{place || "Lieu non renseigné"}</div>
          <div className="tag-row">
            {profile.categoryNames.map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
          </div>
        </div>
      </motion.div>

      {profile.description ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Description</h2>
          </div>
          <p style={{ padding: "0 22px 20px", color: "var(--slate)" }}>{profile.description}</p>
        </div>
      ) : null}

      <div className="panel">
        <div className="panel-head">
          <h2>Coordonnées</h2>
        </div>
        <div className="info-grid">
          {profile.website ? (
            <div className="info-cell">
              <div className="k">SITE WEB</div>
              <div className="v">
                <a href={profile.website} target="_blank" rel="noreferrer">
                  {profile.website}
                </a>
              </div>
            </div>
          ) : null}
          {profile.phone ? (
            <div className="info-cell">
              <div className="k">TÉLÉPHONE</div>
              <div className="v">{profile.phone}</div>
            </div>
          ) : null}
          {profile.email ? (
            <div className="info-cell">
              <div className="k">E-MAIL</div>
              <div className="v">{profile.email}</div>
            </div>
          ) : null}
          {profile.coverageCountries.length > 0 ? (
            <div className="info-cell">
              <div className="k">ZONES COUVERTES</div>
              <div className="v">{profile.coverageCountries.map((c) => `${c.flagEmoji} ${c.name}`).join(", ")}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Services proposés</h2>
        </div>
        <div className="doc-grid">
          {profile.services.map((service) => (
            <div key={service.id} className="doc-card">
              <div className="t">{service.name}</div>
              <div className="org">{service.categoryName}</div>
              {service.description ? <div className="meta">{service.description}</div> : null}
            </div>
          ))}
          {profile.services.length === 0 ? <p className="empty-hint">Ce prestataire n’a pas encore détaillé ses services.</p> : null}
        </div>
      </div>

      {profile.photoUploadIds.length > 0 || profile.portfolioVideos.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Photos &amp; vidéos</h2>
          </div>
          <div className="video-grid" style={{ padding: "0 22px 20px" }}>
            {profile.portfolioVideos.map((url) => (
              <a key={url} className="video-card" href={url} target="_blank" rel="noreferrer">
                <div className="play">▶</div>
                <div className="cap">{url}</div>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <QuoteRequestForm providerId={id} providerName={profile.displayName} />
    </section>
  );
}

function QuoteRequestForm({ providerId, providerName }: { providerId: string; providerName: string }) {
  const [companyName, setCompanyName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetchCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 5)) {
        const result = await uploadQuoteAttachment(file);
        setAttachmentIds((current) => [...current, result.uploadId]);
        setAttachmentNames((current) => [...current, file.name]);
      }
    } catch {
      setError("Impossible d’envoyer une pièce jointe.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!companyName.trim() || !message.trim()) {
      setError("Indiquez au moins la société et votre besoin.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await createQuoteRequest(providerId, {
        companyName: companyName.trim(),
        countryId: countryId || undefined,
        city: city || undefined,
        message: message.trim(),
        attachmentUploadIds: attachmentIds,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d’envoyer la demande.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Demander un devis à {providerName}</h2>
      </div>
      <div className="panel-body">
        {sent ? (
          <p>Votre demande a été envoyée. Le prestataire a été notifié par notification et e-mail.</p>
        ) : (
          <>
            <div className="two-col">
              <label className="field">
                <span>Société demandeuse</span>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nom de votre salle / studio" />
              </label>
              <label className="field">
                <span>Ville</span>
                <input value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>Pays</span>
              <select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
                <option value="">Sélectionner</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.flagEmoji} {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Votre besoin</span>
              <textarea className="custom-textarea" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
            </label>
            <label className="field">
              <span>Pièces jointes (optionnel)</span>
              <input type="file" multiple disabled={uploading} onChange={(e) => void onPickFiles(e.target.files)} />
              {attachmentNames.length > 0 ? (
                <span className="field-hint">{attachmentNames.join(", ")}</span>
              ) : null}
            </label>
            {error ? <p className="auth-error mt-6">{error}</p> : null}
            <Button variant="primary" disabled={sending || uploading} onClick={() => void submit()}>
              {sending ? "Envoi…" : "Envoyer la demande"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
