document.addEventListener("DOMContentLoaded", () => {
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
    if (window.crypto && crypto.randomUUID) return "tipus_" + crypto.randomUUID();
    return "tipus_" + String(Date.now()) + "_" + String(Math.random()).slice(2);
  }

  // --- TOAST ---
  function showToast(message, title = "Perfecte!") {
    const toast = document.getElementById("toast");
    const toastTitle = document.getElementById("toastTitle");
    const toastText = document.getElementById("toastText");
    const closeBtn = document.getElementById("toastClose");

    if (!toast || !toastTitle || !toastText || !closeBtn) return;

    toastTitle.textContent = title;
    toastText.textContent = message;

    toast.classList.add("show");
    toast.setAttribute("aria-hidden", "false");

    const close = () => {
      toast.classList.remove("show");
      toast.setAttribute("aria-hidden", "true");
    };

    closeBtn.onclick = close;
    // click fora de la targeta = tanca
    toast.onclick = (e) => { if (e.target === toast) close(); };

    // ESC per tancar
    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);
  }

  // --- Sync contacte -> Persona 1 ---
  function getFirstPersonaNameInput() {
    const firstBlock = personesDiv?.querySelector(".persona");
    return firstBlock ? firstBlock.querySelector(".p-nom") : null;
  }

  function ensurePersona1SyncWiring() {
    if (!contactNomInput) return;
    const p1 = getFirstPersonaNameInput();
    if (!p1) return;

    if (!p1.dataset.syncMode) p1.dataset.syncMode = "auto";

    if (!p1.dataset.userListenerAttached) {
      p1.addEventListener("input", () => {
        p1.dataset.syncMode = "manual";
      });
      p1.dataset.userListenerAttached = "1";
    }

    if (!contactNomInput.dataset.syncListenerAttached) {
      contactNomInput.addEventListener("input", () => {
        const p1now = getFirstPersonaNameInput();
        if (!p1now) return;
        if (p1now.dataset.syncMode !== "auto") return;
        p1now.value = contactNomInput.value;
      });
      contactNomInput.dataset.syncListenerAttached = "1";
    }

    if (p1.dataset.syncMode === "auto" && !p1.value.trim()) {
      p1.value = contactNomInput.value;
    }
  }

  function addPersona(prefillName = "") {
    if (!tpl || !personesDiv) return;

    const node = tpl.content.cloneNode(true);
    const wrap = node.querySelector(".persona");
    if (!wrap) return;

    const nom = wrap.querySelector(".p-nom");

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

    // radios: mutuament exclusius
    if (adultRadio && nenRadio) {
      const group = newGroupName();
      adultRadio.name = group;
      nenRadio.name = group;
    }

    function refreshChildUI() {
      const isNen = [...radios].some((r) => r.checked && r.value === "Nen");
      if (edatWrap) edatWrap.style.display = isNen ? "block" : "none";
      if (!isNen && edat) edat.value = "";
    }

    function refreshDietUI() {
      const isAltres = dieta && dieta.value === "Altres";
      if (dietaAltresWrap) dietaAltresWrap.style.display = isAltres ? "block" : "none";
      if (!isAltres && dietaAltres) dietaAltres.value = "";
    }

    radios.forEach((r) => r.addEventListener("change", refreshChildUI));
    if (dieta) dieta.addEventListener("change", refreshDietUI);

    if (removeBtn) {
      removeBtn.addEventListener("click", () => wrap.remove());
    }

    // estat inicial correcte
    refreshChildUI();
    refreshDietUI();

    personesDiv.appendChild(node);
    ensurePersona1SyncWiring();
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
    const blocks = personesDiv?.querySelectorAll(".persona") || [];
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

    if (!contact.telefon && !contact.email) {
      setStatus("Posa almenys un telèfon o un correu electrònic, si us plau.");
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

    submitBtn && (submitBtn.disabled = true);
    setStatus("Enviant…");

    try {
      const body = new URLSearchParams();
      body.set("payload", JSON.stringify(payload));

      const res = await fetch(ENDPOINT, {
        method: "POST",
        body,
        redirect: "follow",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text ? "— " + text.slice(0, 200) : ""}`);
      }

      setStatus("Perfecte! Resposta enviada. 🙌");
      showToast("Resposta enviada. Ara ja estàs dins. Recorda porta roba interior sexy 😈", "Perfecte!");

      e.target.reset();

      // Rebuild persons area
      if (personesDiv) personesDiv.innerHTML = "";
      addPersona();

      // Keep Saturday dinner checked (just in case)
      if (e.target.elements["apat_dissabte_sopar"]) {
        e.target.elements["apat_dissabte_sopar"].checked = true;
      }
    } catch (err) {
      setStatus("Ups… no s'ha pogut enviar. " + (err?.message || "Torna-ho a provar."));
      console.error(err);
    } finally {
      submitBtn && (submitBtn.disabled = false);
    }
  });
});
