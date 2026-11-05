import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

type Format = "physique" | "numerique";
type Entry = { id: string; type: "commence" | "lu" | "abandonne" | "achat"; format: Format; title: string; date: string; palImpact?: boolean };
type EnCours = { id: string; title: string; format: Format };

const STORAGE_KEY = "pal-tracker-v1";

const THEME = {
  fond: "linear-gradient(165deg,#141f16 0%,#1c2b1e 40%,#231a22 75%,#141a14 100%)",
  parchemin: "#f0e8d8",
  parcheminSombre: "#e6dbc4",
  or: "#c9a24b",
  orPale: "#a98f4f",
  vertFonce: "#1e3325",
  burgundy: "#6d1f2e",
  encre: "#2b2620",
  brume: "#7a7264",
};

const cardStyle: React.CSSProperties = {
  background: `linear-gradient(170deg, ${THEME.parchemin} 0%, ${THEME.parcheminSombre} 100%)`,
  border: `1px solid ${THEME.orPale}`,
  boxShadow: `0 4px 14px rgba(0,0,0,0.45), inset 0 0 0 4px ${THEME.parchemin}, inset 0 0 0 5px ${THEME.orPale}`,
  borderRadius: "4px",
};

const inputStyle: React.CSSProperties = {
  background: "#efe6d0",
  border: `1px solid ${THEME.brume}`,
  color: THEME.encre,
};

const aujourdhui = () => new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [pal, setPal] = useState(15);
  const [lusDepuisAchat, setLusDepuisAchat] = useState(0);
  const [historique, setHistorique] = useState<Entry[]>([]);
  const [enCours, setEnCours] = useState<EnCours[]>([]);
  const [titre, setTitre] = useState("");
  const [format, setFormat] = useState<Format>("physique");
  const [titreAchat, setTitreAchat] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d.pal === "number") setPal(d.pal);
        if (typeof d.lusDepuisAchat === "number") setLusDepuisAchat(d.lusDepuisAchat);
        if (Array.isArray(d.historique)) setHistorique(d.historique);
        if (Array.isArray(d.enCours)) setEnCours(d.enCours);
      }
    } catch (e) {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pal, lusDepuisAchat, historique, enCours })
      );
    } catch (e) {}
  }, [pal, lusDepuisAchat, historique, enCours, loaded]);

  const achatsAutorises = Math.floor(lusDepuisAchat / 2);
  const progres = (lusDepuisAchat % 2) / 2;

  /* — Livre commencé : il sort de la PAL et fait avancer le pacte — */
  const commencerLivre = () => {
    const t = titre.trim();
    if (!t) return;
    if (format === "physique") {
      if (pal > 0) setPal(pal - 1);
      const nouveau = lusDepuisAchat + 1;
      setLusDepuisAchat(nouveau);
      if (nouveau % 2 === 0) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 3500);
      }
    }
    setEnCours((l) => [...l, { id: crypto.randomUUID(), title: t, format }]);
    setHistorique((h) => [
      { id: crypto.randomUUID(), type: "commence", format, title: t, date: aujourdhui(), palImpact: format === "physique" },
      ...h,
    ]);
    setTitre("");
  };

  /* — Lecture en cours terminée — */
  const terminerLivre = (id: string) => {
    const l = enCours.find((x) => x.id === id);
    if (!l) return;
    setEnCours((c) => c.filter((x) => x.id !== id));
    setHistorique((h) => [
      { id: crypto.randomUUID(), type: "lu", format: l.format, title: l.title, date: aujourdhui(), palImpact: false },
      ...h,
    ]);
  };

  /* — Abandonné : quitte les lectures en cours, sans culpabilité — */
  const abandonnerLivre = (id: string) => {
    const l = enCours.find((x) => x.id === id);
    if (!l) return;
    setEnCours((c) => c.filter((x) => x.id !== id));
    setHistorique((h) => [
      { id: crypto.randomUUID(), type: "abandonne", format: l.format, title: l.title, date: aujourdhui(), palImpact: false },
      ...h,
    ]);
  };

  const ajouterAchat = () => {
    const t = titreAchat.trim() || "Nouveau livre 🗝️";
    setPal(pal + 1);
    setHistorique((h) => [
      { id: crypto.randomUUID(), type: "achat", format: "physique", title: t, date: aujourdhui() },
      ...h,
    ]);
    setTitreAchat("");
  };

  const annuler = (id: string) => {
    const e = historique.find((x) => x.id === id);
    if (!e) return;
    if (e.type === "achat") {
      setPal((p) => Math.max(0, p - 1));
    } else if (e.type === "commence") {
      if (e.palImpact) {
        setPal((p) => p + 1);
        setLusDepuisAchat((n) => Math.max(0, n - 1));
      }
      setEnCours((c) => c.filter((x) => x.title !== e.title));
    } else if (e.type === "lu" && e.palImpact !== false && e.format === "physique") {
      setLusDepuisAchat((n) => Math.max(0, n - 1));
      setPal((p) => p + 1); // anciennes entrées
    }
    setHistorique((h) => h.filter((x) => x.id !== id));
  };

  const livresPal = Math.min(pal, 24);
  const livresPalLu = Math.min(lusDepuisAchat % 2, 2);

  /* — Sorties de PAL (livres commencés physiques) — */
  const sortiesDePal = historique.filter(
    (e) => e.type === "commence" && e.palImpact === true
  ).length + historique.filter((e) => e.type === "lu" && e.palImpact !== false && e.format === "physique").length;

  const nbAchats = historique.filter((e) => e.type === "achat").length;
  const nbLus = historique.filter((e) => e.type === "lu").length;

  /* — Trophées de sorcière 🧙‍♀️ — */
  const badges = [
    { id: "chandelle", emoji: "🕯️", nom: "La Première Chandelle du Sabbat", desc: "1er livre sorti de la PAL", obtenu: sortiesDePal >= 1 },
    { id: "sortilege", emoji: "🌱", nom: "Le Sortilège Appris", desc: "2 livres sortis de la PAL", obtenu: sortiesDePal >= 2 },
    { id: "apprentie", emoji: "🌿", nom: "Apprentie du Grimoire", desc: "5 livres sortis de la PAL", obtenu: sortiesDePal >= 5 },
    { id: "incantatrice", emoji: "🌳", nom: "L'Incantatrice", desc: "10 livres sortis de la PAL", obtenu: sortiesDePal >= 10 },
    { id: "sibylle", emoji: "🦉", nom: "La Sibylle Occulte", desc: "20 livres sortis de la PAL", obtenu: sortiesDePal >= 20 },
    { id: "cle", emoji: "🗝️", nom: "La Première Clé du Coffre", desc: "1er achat mérité par le pacte", obtenu: nbAchats >= 1 },
    { id: "malefice", emoji: "🕸️", nom: "Maléfice Enchanté", desc: "PAL descendue sous 10", obtenu: pal < 10 },
    { id: "voile", emoji: "🌫️", nom: "Le Voile se Lève", desc: "PAL descendue sous 5", obtenu: pal < 5 },
    { id: "oeuvre", emoji: "🏆", nom: "Le Grand Œuvre Accompli", desc: "Vider entièrement la pile", obtenu: pal === 0 },
    { id: "etincelle", emoji: "✨", nom: "Étincelle Magique", desc: "1er livre terminé", obtenu: nbLus >= 1 },
    { id: "croissant", emoji: "🌘", nom: "Croissant Envoûté", desc: "5 livres terminés", obtenu: nbLus >= 5 },
    { id: "potion", emoji: "🌕", nom: "Potion de Pleine Lune", desc: "10 livres terminés", obtenu: nbLus >= 10 },
    { id: "comete", emoji: "🌠", nom: "Comète des Sortilèges", desc: "20 livres terminés", obtenu: nbLus >= 20 },
    { id: "dragon", emoji: "🐉", nom: "Le Dragon du Grimoire", desc: "50 livres terminés", obtenu: nbLus >= 50 },
  ];
  const badgesObtenus = badges.filter((b) => b.obtenu).length;

  /* — Série : livres sortis de la PAL depuis le dernier achat — */
  const serieLivres = (() => {
    const estSortie = (e: Entry) => (e.type === "commence" && e.palImpact === true) || (e.type === "lu" && e.palImpact !== false && e.format === "physique");
    const idxAchat = historique.findIndex((e) => e.type === "achat");
    return idxAchat === -1
      ? historique.filter(estSortie).length
      : historique.slice(0, idxAchat).filter(estSortie).length;
  })();

  /* — Trajectoire de la PAL — */
  const delta = (e: Entry) => {
    if (e.type === "achat") return 1;
    if (e.type === "commence") return e.palImpact ? -1 : 0;
    if (e.type === "lu") return e.palImpact === false ? 0 : -1; // anciennes entrées
    return 0;
  };
  const trajectoire = (() => {
    const total = historique.reduce((s, e) => s + delta(e), 0);
    const points = [
      { nom: "Début", pal: pal - total },
      ...[...historique].reverse().map((e, i, arr) => {
        const somme = arr.slice(0, i + 1).reduce((s, x) => s + delta(x), 0);
        return { nom: `${e.date} ${i + 1}`, pal: (pal - total) + somme };
      }),
    ].filter((p, i, arr) => i === 0 || p.pal !== arr[i - 1].pal);
    return points;
  })();
  const palInitiale = trajectoire.length > 0 ? trajectoire[0].pal : pal;

  const emojiType = (e: Entry) =>
    e.type === "commence" ? "🔖" : e.type === "lu" ? "📖" : e.type === "abandonne" ? "⚰️" : "🗝️";
  const impactPal = (e: Entry) => {
    if (e.type === "achat") return "+1";
    if (e.type === "commence") return e.palImpact ? "−1" : "±0";
    if (e.type === "lu") return e.palImpact === false ? "±0" : "−1";
    return "±0";
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center gap-6 px-4 py-10"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 2.5rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 2.5rem)",
        background: THEME.fond,
        fontFamily: "'Georgia', 'Times New Roman', serif",
        color: THEME.parchemin,
      }}
    >
      {/* Titre */}
      <div className="text-center">
        <p className="text-xl tracking-[0.5em] mb-1" style={{ color: THEME.or }}>
          ✦ ❦ ✦
        </p>
        <h1
          className="text-4xl font-bold tracking-[0.15em] uppercase"
          style={{ color: THEME.or, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
        >
          Mon Grimoire de PAL
        </h1>
        <p className="text-sm italic mt-2 tracking-wide" style={{ color: "#c9bfa8" }}>
          Deux lectures pour un achat — tel est le pacte ✨
        </p>
        <p className="text-lg tracking-[0.4em] mt-1" style={{ color: THEME.orPale }}>
          ✦ ─── ✦
        </p>
      </div>

      {/* Compteur PAL */}
      <motion.div layout className="w-full max-w-md p-6 text-center" style={cardStyle}>
        <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: THEME.burgundy }}>
          La Pile à Lire
        </p>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={pal}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="text-6xl font-bold"
            style={{ color: pal === 0 ? THEME.vertFonce : THEME.burgundy }}
          >
            {pal}
          </motion.div>
        </AnimatePresence>
        <p className="text-sm mt-2 italic" style={{ color: THEME.encre }}>
          {pal === 0
            ? "Pile épuisée — le Grand Œuvre est accompli ! 🧙‍♀️"
            : pal <= 5
            ? "Plus que quelques volumes, le Voile se lève…"
            : "Un livre commencé, un livre sorti de la pile 🍃"}
        </p>
        <div className="flex justify-center flex-wrap gap-1 mt-4">
          {Array.from({ length: livresPal }).map((_, i) => (
            <span key={i} className="text-lg">📚</span>
          ))}
          {pal > 24 && <span className="text-lg">…</span>}
        </div>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPal((p) => Math.max(0, p - 1))}
            className="w-8 h-8 text-lg font-bold"
            style={{ background: "transparent", color: THEME.burgundy, border: `1px solid ${THEME.brume}` }}
            title="Retirer un livre de la PAL"
          >
            −
          </button>
          <span className="text-xs italic" style={{ color: THEME.brume }}>
            Ajuster la pile
          </span>
          <button
            onClick={() => setPal((p) => p + 1)}
            className="w-8 h-8 text-lg font-bold"
            style={{ background: THEME.vertFonce, color: THEME.parchemin, border: `1px solid ${THEME.or}` }}
            title="Ajouter un livre à la PAL"
          >
            +
          </button>
        </div>
      </motion.div>

      {/* Série */}
      <motion.div layout className="w-full max-w-md p-5 flex items-center justify-between" style={cardStyle}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <div>
            <p className="text-xs uppercase tracking-[0.3em]" style={{ color: THEME.burgundy }}>
              Série sans achat
            </p>
            <p className="text-sm italic" style={{ color: THEME.encre }}>
              {serieLivres === 0
                ? "Ta série démarre à ta prochaine pile entamée 🌱"
                : `${serieLivres} livre${serieLivres > 1 ? "s" : ""} sorti${serieLivres > 1 ? "s" : ""} de la PAL depuis ton dernier achat`}
            </p>
          </div>
        </div>
        <motion.span
          key={serieLivres}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl font-bold"
          style={{ color: THEME.vertFonce }}
        >
          {serieLivres}
        </motion.span>
      </motion.div>

      {/* Graphique PAL */}
      <motion.div layout className="w-full max-w-md p-6" style={cardStyle}>
        <p className="text-xs uppercase tracking-[0.3em] mb-1" style={{ color: THEME.burgundy }}>
          Évolution de la Pile 📉
        </p>
        <p className="text-xs italic mb-3" style={{ color: THEME.brume }}>
          {historique.length === 0
            ? "La courbe naîtra à ton premier livre consigné…"
            : `De ${palInitiale} à ${pal} — la transmutation est en cours 🧙‍♀️`}
        </p>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trajectoire} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <XAxis dataKey="nom" tick={{ fill: THEME.brume, fontSize: 9, fontStyle: "italic" }} tickLine={false} axisLine={{ stroke: THEME.brume }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fill: THEME.brume, fontSize: 10 }} tickLine={false} axisLine={{ stroke: THEME.brume }} allowDecimals={false} domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip
                contentStyle={{ background: THEME.parchemin, border: `1px solid ${THEME.orPale}`, fontFamily: "Georgia, serif", fontSize: 12 }}
                labelStyle={{ color: THEME.brume }}
                formatter={(v) => [`${v} livres`, "PAL"]}
              />
              <Line type="stepAfter" dataKey="pal" stroke={THEME.vertFonce} strokeWidth={2} dot={{ r: 3, fill: THEME.or, stroke: THEME.vertFonce }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Barre "2 lus = 1 achat" */}
      <motion.div layout className="w-full max-w-md p-6" style={cardStyle}>
        <p className="text-xs uppercase tracking-[0.3em] mb-4 text-center" style={{ color: THEME.burgundy }}>
          Prochain achat en vue 👀
        </p>
        <div className="flex items-center justify-center gap-5">
          {[0, 1].map((slot) => (
            <motion.div
              key={slot}
              animate={livresPalLu > slot ? { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] } : { scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-11 h-14 rounded-sm flex items-center justify-center text-2xl"
              style={{
                background: THEME.vertFonce,
                border: `1px solid ${livresPalLu > slot ? THEME.or : THEME.brume}`,
                color: THEME.parchemin,
              }}
            >
              {livresPalLu > slot ? "✦" : ""}
            </motion.div>
          ))}
          <span className="text-2xl" style={{ color: THEME.or }}>❥</span>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{
              background: achatsAutorises > 0 ? THEME.vertFonce : "#d8ceb8",
              border: `2px solid ${achatsAutorises > 0 ? THEME.or : THEME.brume}`,
            }}
          >
            {achatsAutorises > 0 ? "🗝️" : "🔒"}
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden" style={{ background: "#d8ceb8", border: `1px solid ${THEME.brume}` }}>
          <motion.div
            className="h-full"
            style={{ background: `linear-gradient(90deg, ${THEME.vertFonce}, ${THEME.or})` }}
            animate={{ width: `${progres * 100}%` }}
          />
        </div>
        <p className="text-center text-sm mt-3 italic" style={{ color: THEME.encre }}>
          {achatsAutorises > 0
            ? `🗝️ ${achatsAutorises} achat${achatsAutorises > 1 ? "s" : ""} autorisé${achatsAutorises > 1 ? "s" : ""} — la Clé du Coffre est à toi !`
            : progres > 0
            ? "Encore un livre commencé et le coffre s'ouvre…"
            : "Deux livres sortis de la pile avant le prochain achat 📖"}
        </p>
      </motion.div>

      {/* Lectures en cours */}
      <motion.div layout className="w-full max-w-md p-6" style={cardStyle}>
        <p className="text-xs uppercase tracking-[0.3em] mb-1" style={{ color: THEME.burgundy }}>
          Lectures en cours 🔖
        </p>
        <p className="text-xs italic mb-3" style={{ color: THEME.brume }}>
          {enCours.length === 0
            ? "Aucune lecture en cours… le grimoire attend sa prochaine page 🪶"
            : `${enCours.length} livre${enCours.length > 1 ? "s" : ""} entre tes mains : scelle leur sort quand tu veux ✦`}
        </p>
        <ul className="flex flex-col gap-2">
          <AnimatePresence>
            {enCours.map((l) => (
              <motion.li
                key={l.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 px-3 py-2"
                style={{ background: "#eae4cd", border: `1px solid #c5c0a5`, color: THEME.encre }}
              >
                <span className="text-lg">{l.format === "physique" ? "📕" : "📱"}</span>
                <span className="flex-1 truncate text-sm font-semibold">{l.title}</span>
                <button
                  onClick={() => abandonnerLivre(l.id)}
                  className="text-xs italic px-2 py-1"
                  style={{ color: THEME.brume }}
                  title="Abandonné sans culpabilité"
                >
                  ⚰️
                </button>
                <button
                  onClick={() => terminerLivre(l.id)}
                  className="text-xs font-semibold px-3 py-1"
                  style={{ background: THEME.vertFonce, color: THEME.parchemin, border: `1px solid ${THEME.or}` }}
                >
                  Terminé ✦
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </motion.div>

      {/* Formulaire livre commencé */}
      <motion.div layout className="w-full max-w-md p-6" style={cardStyle}>
        <p className="text-xs uppercase tracking-[0.3em] mb-1" style={{ color: THEME.burgundy }}>
          Je commence un livre 🔖
        </p>
        <p className="text-xs italic mb-3" style={{ color: THEME.brume }}>
          Il rejoint tes lectures en cours et <b>sort de la PAL</b> 🍃 — seuls les livres physiques 📕 en sortent
        </p>
        <div className="flex gap-2 mb-3">
          {([["physique", "📕 Physique"], ["numerique", "📱 Numérique"]] as const).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className="px-4 py-1.5 text-sm font-semibold"
              style={{
                background: format === f ? THEME.vertFonce : "transparent",
                color: format === f ? THEME.parchemin : THEME.encre,
                border: `1px solid ${format === f ? THEME.or : THEME.brume}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Titre du livre"
            className="flex-1 min-w-0 px-3 py-2 text-base outline-none"
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && commencerLivre()}
          />
          <button
            onClick={commencerLivre}
            className="px-4 py-2 text-sm font-semibold"
            style={{ background: THEME.vertFonce, color: THEME.parchemin, border: `1px solid ${THEME.or}` }}
          >
            Commencer ✦
          </button>
        </div>
      </motion.div>

      {/* Formulaire achat */}
      <motion.div layout className="w-full max-w-md p-6" style={cardStyle}>
        <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: THEME.burgundy }}>
          Nouvel achat 🛒 (+1 à la PAL)
        </p>
        <div className="flex gap-2">
          <input
            value={titreAchat}
            onChange={(e) => setTitreAchat(e.target.value)}
            placeholder="Titre du livre acheté"
            className="flex-1 min-w-0 px-3 py-2 text-base outline-none"
            style={inputStyle}
          />
          <button
            onClick={ajouterAchat}
            disabled={achatsAutorises === 0}
            className="px-4 py-2 text-sm font-semibold"
            style={{
              background: achatsAutorises > 0 ? THEME.burgundy : "#cfc4ad",
              color: achatsAutorises > 0 ? THEME.parchemin : "#8a7f6c",
              border: `1px solid ${achatsAutorises > 0 ? THEME.or : THEME.brume}`,
              cursor: achatsAutorises > 0 ? "pointer" : "not-allowed",
            }}
            title={achatsAutorises === 0 ? "Encore 2 lectures terminées d'abord 😉" : ""}
          >
            Acheté 🗝️
          </button>
        </div>
        {achatsAutorises === 0 && (
          <p className="text-xs italic mt-2 text-center" style={{ color: THEME.brume }}>
            Le pacte est clair : deux lectures d'abord ! 😄
          </p>
        )}
      </motion.div>

      {/* Mur des trophées */}
      <motion.div layout className="w-full max-w-md p-6" style={cardStyle}>
        <p className="text-xs uppercase tracking-[0.3em] mb-1" style={{ color: THEME.burgundy }}>
          La Salle des Trophées 🏆
        </p>
        <p className="text-xs italic mb-4" style={{ color: THEME.brume }}>
          {badgesObtenus} / {badges.length} sortilèges accomplis — {sortiesDePal} livre{sortiesDePal > 1 ? "s" : ""} sorti{sortiesDePal > 1 ? "s" : ""} de la PAL à ce jour ✦
        </p>
        <div className="h-2 mb-4 overflow-hidden" style={{ background: "#d8ceb8", border: `1px solid ${THEME.brume}` }}>
          <motion.div
            className="h-full"
            style={{ background: `linear-gradient(90deg, ${THEME.vertFonce}, ${THEME.or})` }}
            animate={{ width: `${(badgesObtenus / badges.length) * 100}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {badges.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-2 px-3 py-2 rounded-sm"
              style={{
                background: b.obtenu ? "#e9e0c5" : "#ddd4bd",
                border: `1px solid ${b.obtenu ? THEME.or : THEME.brume}`,
                opacity: b.obtenu ? 1 : 0.45,
              }}
            >
              <span className="text-xl" style={{ filter: b.obtenu ? "none" : "grayscale(1)" }}>{b.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: THEME.encre }}>{b.nom}</p>
                <p className="text-[10px] italic truncate" style={{ color: THEME.brume }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Historique */}
      <motion.div layout className="w-full max-w-md p-6" style={cardStyle}>
        <p className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: THEME.burgundy }}>
          Le Grand Registre ({historique.length})
        </p>
        <div className="flex justify-center gap-4 text-xs italic mb-3" style={{ color: THEME.brume }}>
          <span>📖 {nbLus} terminé{nbLus > 1 ? "s" : ""}</span>
          <span>🗝️ {nbAchats} achat{nbAchats > 1 ? "s" : ""}</span>
        </div>
        {historique.length === 0 ? (
          <p className="text-sm italic text-center py-4" style={{ color: THEME.brume }}>
            Les pages sont encore vierges… à ta plume ! 🪶
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            <AnimatePresence>
              {historique.map((e) => (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                  style={{
                    background: e.type === "lu" ? "#eae4cd" : e.type === "abandonne" ? "#e4dcd6" : "#e9dcd3",
                    border: `1px solid ${e.type === "lu" ? "#c5c0a5" : e.type === "abandonne" ? "#c8bcb2" : "#d3b8ac"}`,
                    color: THEME.encre,
                  }}
                >
                  <span className="text-lg">{emojiType(e)}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm"
                    style={{
                      background: e.type === "achat" ? "#e9dcd3" : e.type === "commence" && e.palImpact ? "#e2e8d5" : "#ddd4bd",
                      color: e.type === "achat" ? THEME.burgundy : e.type === "commence" && e.palImpact ? THEME.vertFonce : THEME.brume,
                      border: `1px solid ${e.type === "achat" ? "#d3b8ac" : e.type === "commence" && e.palImpact ? "#c2cfae" : THEME.brume}`,
                    }}
                  >
                    {impactPal(e)}
                  </span>
                  <span className="flex-1 truncate">{e.title}</span>
                  <span className="text-xs" style={{ color: THEME.brume }}>{e.date}</span>
                  <button
                    onClick={() => annuler(e.id)}
                    className="text-xs px-1"
                    style={{ color: THEME.brume }}
                    title="Annuler"
                  >
                    ✕
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </motion.div>

      <p className="text-xs italic text-center max-w-md tracking-wide" style={{ color: "#9a917d" }}>
        ❦ Tes données sont consignées sur ton appareil 💾 ❦
      </p>

      {/* Confettis */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-50"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-2xl"
                style={{ left: `${(i * 53) % 100}%`, top: "-5%" }}
                initial={{ y: -40, opacity: 1, rotate: 0 }}
                animate={{ y: "110vh", opacity: 0, rotate: 360 }}
                transition={{ duration: 2.5 + (i % 5) * 0.4, delay: (i % 7) * 0.1 }}
              >
                {["✨", "✦", "🕯️", "🗝️"][i % 4]}
              </motion.span>
            ))}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
            >
              <div
                className="px-10 py-7 text-center"
                style={{
                  background: `linear-gradient(170deg, ${THEME.parchemin} 0%, ${THEME.parcheminSombre} 100%)`,
                  border: `2px solid ${THEME.or}`,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
                }}
              >
                <p className="text-4xl mb-2">🗝️✨🗝️</p>
                <p className="text-lg font-bold uppercase tracking-[0.2em]" style={{ color: THEME.burgundy }}>
                  La Clé du Coffre !
                </p>
                <p className="text-sm italic mt-1" style={{ color: THEME.encre }}>
                  Deux lectures terminées — le pacte t'ouvre ses trésors.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}