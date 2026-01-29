// --- Config ---
const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzouNEdvURViFn2wcnUk40j7JnMG5iVNSjej15GQT7ylZDQicr1QI9P58lYa4ETZb_V6g/exec";

// --- DOM refs ---
const personesDiv = document.getElementById("persones");
const tpl = document.getElementById("personaTpl");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const contactNomInput = document.querySelector('input[name="contact_nom"]');
const dormirNoEl = document.getElementsByName("dormir_no")?.[0];
const dormirVD = document.getElementsByName("dormir_divendres_dissabte")?.[0];
const dormirDD = document.getElementsByName("dormir_dissabte_diumenge")?.[0];


function setStatus(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
}

function newGroupName() {
  // Radios need the same "name" to be mutually exclusive
  if (window.crypto && crypto.randomUUID) return "tipus_" + crypto.randomUUID();
  return "tipus_" + String(Date.now()) + "_" + String(Math.random()).slice(2);
}

// --- Sync contacte -> Persona 1 (live until user edits Persona 1) ---
function getFirstPersonaNameInput() {
  const firstBlock = personesDiv?.querySelector(".persona");
  return firstBlock ? firstBlock.querySelector(".p-nom") : null;
}

function ensurePersona1SyncWiring() {
  if (!contactNomInput) return;
  const p1 = getFirstPersonaNameInput();
  if (!p1) return;

  // Initialize sync state
  if (!p1.dataset.syncMode) {
    p1.dataset.syncMode = "auto"; // auto = follow contact name
  }

  // If user edits Persona 1 manually, stop syncing
  if (!p1.dataset.userListenerAttached) {
    p1.addEventListener("input", () => {
      p1.dataset.syncMode = "manual";
    });
    p1.dataset.userListenerAttached = "1";
  }

  // When contact name changes, update Persona 1 if still auto
  if (!contactNomInput.dataset.syncListenerAttached) {
    contactNomInput.addEventListener("input", () => {
      const p1now = getFirstPersonaNameInput();
      if (!p1now) return;
      if (p1now.dataset.syncMode !== "auto") return;

      p1now.value = contactNomInput.value;
    });
    contactNomInput.dataset.syncListenerAttached = "1";
  }

  // Initial fill if empty and in auto mode
  if (p1.dataset.syncMode === "auto" && !p1.value.trim()) {
    p1.value = contactNomInput.value;
  }
}

function addPersona(prefillName = "") {
  if (!tpl || !personesDiv) return;

  const node = tpl.content.cloneNode(true);
  const wrap = node.querySelector(".persona");

  const nom = wrap.querySelector(".p-nom");

  // Requires in index.html template:
  // <input type="radio" class="p-tipus p-adult" ...>
  // <input type="radio" class="p-tipus p-nen" ...>
  const adultRadio = wrap.querySelector(".p-adult");
  const nenRadio = wrap.querySelector(".p-nen");
  const radios = wrap.querySelectorAll(".p-tipus");

  const edatWrap = wrap.querySelector(".p-edat-wrap");
  const edat = wrap.querySelector(".p-edat");

  const dieta = wrap.querySelector(".p-dieta");
  const dietaAltresWrap = wrap.querySelector(".p-dieta-altres-wrap");
  const dietaAltres = wrap.querySelector(".p-dieta-altres");

  const removeBtn = wrap.querySelector(".removePersona");

  if (nom) nom.value = prefillName;

  // Group Adult/Nen radios so they are mutually exclusive
  if (adultRadio && nenRadio) {
    const group = newGroupName();
    adultRadio.name = group;
    nenRadio.name = group;
  }

function refreshChildUI() {
  const isNen = [...radios].some((r) => r.checked && r.value === "Nen");
  if (edatWrap) edatWrap.classList.toggle("is-open", isNen);
  if (!isNen && edat) edat.value = "";
}

function refreshDietUI() {
  const isAltres = dieta && dieta.value === "Altres";
  if (dietaAltresWrap) dietaAltresWrap.classList.toggle("is-open", isAltres);
  if (!isAltres && dietaAltres) dietaAltres.value = "";
}


  radios.forEach((r) => r.addEventListener("change", refreshChildUI));
  if (dieta) dieta.addEventListener("change", refreshDietUI);

  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      wrap.remove();
    });
  }

  refreshChildUI();
  refreshDietUI();

  personesDiv.appendChild(node);
}

document.getElementById("addPersona")?.addEventListener("click", () => addPersona());

// Add 1 person by default
addPersona();
ensurePersona1SyncWiring();

// Allotjament: coherència entre "No" i les nits
dormirNoEl?.addEventListener("change", (e) => {
  if (e.target.checked) {
    if (dormirVD) dormirVD.checked = false;
    if (dormirDD) dormirDD.checked = false;
  }
});

function uncheckDormirNoIfNeeded() {
  if (!dormirNoEl) return;
  const anyNight = (!!dormirVD?.checked) || (!!dormirDD?.checked);
  if (anyNight) dormirNoEl.checked = false;
}

dormirVD?.addEventListener("change", uncheckDormirNoIfNeeded);
dormirDD?.addEventListener("change", uncheckDormirNoIfNeeded);

function collectPersones() {
  const blocks = personesDiv.querySelectorAll(".persona");
  const persones = [];

  blocks.forEach((b) => {
    const n = b.querySelector(".p-nom")?.value?.trim() || "";
    if (!n) return;

    const tipus =
      [...b.querySelectorAll(".p-tipus")].find((r) => r.checked)?.value || "Adult";
    const esNen = tipus === "Nen";
    const edatVal = b.querySelector(".p-edat")?.value;

    const dietaTipus = b.querySelector(".p-dieta")?.value || "Cap";
    const dietaAltres = b.querySelector(".p-dieta-altres")?.value?.trim() || "";

    persones.push({
      nom: n,
      esNen,
      edat: esNen ? (edatVal ? Number(edatVal) : "") : "",
      dietaTipus,
      dietaAltres,
    });
  });

  return persones;
}

document.getElementById("rsvpForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");

  // Honeypot anti-spam
  const hp = e.target.elements["website"]?.value;
  if (hp && hp.trim().length > 0) return;

  const contact = {
    nom: e.target.elements["contact_nom"]?.value?.trim() || "",
    telefon: e.target.elements["contact_telefon"]?.value?.trim() || "",
    email: e.target.elements["contact_email"]?.value?.trim() || "",
  };
// Validació: cal telèfon o email (almenys un)
if (!contact.telefon && !contact.email) {
  setStatus("Posa almenys un telèfon o un correu electrònic, si us plau.");
  submitBtn.disabled = false;
  return;
}


  const persones = collectPersones();
  if (persones.length === 0) {
    setStatus("Afegeix com a mínim una persona.");
    return;
  }

  const apats = {
    soparDivendres: !!e.target.elements["apat_divendres"]?.checked,
    dinarDissabte: !!e.target.elements["apat_dissabte_dinar"]?.checked,
    soparDissabte: true, // obligatori
    dinarDiumenge: !!e.target.elements["apat_diumenge"]?.checked,
  };

  const dormirNo = !!e.target.elements["dormir_no"]?.checked;
  const dormir = {
    divendresDissabte:
      !dormirNo && !!e.target.elements["dormir_divendres_dissabte"]?.checked,
    dissabteDiumenge:
      !dormirNo && !!e.target.elements["dormir_dissabte_diumenge"]?.checked,
  };

  const payload = {
    contact,
    persones,
    apats,
    dormir,
    comentaris: e.target.elements["comentaris"]?.value?.trim() || "",
  };

  submitBtn.disabled = true;
  setStatus("Enviant…");

  try {
    // Robust POST to Apps Script: send as x-www-form-urlencoded payload=
    const body = new URLSearchParams();
    body.set("payload", JSON.stringify(payload));

    const res = await fetch(ENDPOINT, {
      method: "POST",
      body, // IMPORTANT: no headers
    });

    if (!res.ok) throw new Error("HTTP " + res.status);

    setStatus("Perfecte! Resposta enviada. 🙌");

    e.target.reset();

    // Rebuild persons area
    personesDiv.innerHTML = "";
    addPersona();
    ensurePersona1SyncWiring();

    // Keep Saturday dinner checked (it's disabled but just in case)
    if (e.target.elements["apat_dissabte_sopar"]) {
      e.target.elements["apat_dissabte_sopar"].checked = true;
    }
  } catch (err) {
    setStatus("Ups… no s'ha pogut enviar. Torna-ho a provar.");
    console.error(err);
  } finally {
    submitBtn.disabled = false;
  }
});
