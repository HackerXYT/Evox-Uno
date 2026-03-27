const express = require('express');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

/* ══════════════════════════════════════════════════════════
  ΕΙΚΟΝΙΚΑ ΣΕΝΑΡΙΑ
  Κάθε εγγραφή αντιστοιχεί σε trigger index του frontend (0-3).
  Το ariaResume περιέχει και τα δύο μηνύματα έκβασης ώστε το
  frontend να επιλέξει το σωστό όταν επιστρέψει η απόφαση.
══════════════════════════════════════════════════════════ */
const SCENARIOS = [
  {
    id: 0,
    trigger: 'πρόσβαση db',
    agentName: 'Πράκτορας Ασφάλειας',
    requestId: 'hitl-20260327-a4f91c',
    urgency: 'high',
    approverRole: 'it-security-manager',
    escalationRole: 'ciso',
    slaMins: 120,
    ariaThink: 'Εντοπίστηκε περιορισμένη ενέργεια: αίτημα πρόσβασης σε βάση παραγωγής…',
    ariaBlock:
      'Εντόπισα ότι πρόκειται για **ενέργεια υψηλού κινδύνου** που στοχεύει πόρο παραγωγής με οικονομικά δεδομένα. ' +
      'Πρέπει να κάνω παύση και να λάβω έγκριση από Διαχειριστή Ασφάλειας Πληροφορικής πριν συνεχίσω. ' +
      'Γίνεται δρομολόγηση στο HITL Gateway τώρα…',
    ariaResume: {
      approved:
        '✅ Η πρόσβαση παραχωρήθηκε! Έχεις πλέον **πρόσβαση ανάγνωσης** στη `prod-financial-reports-db` ' +
        'για τις επόμενες 24 ώρες. Μπορείς να ξεκινήσεις την ανάλυση P&L.',
      denied:
        '❌ Το αίτημά σου απορρίφθηκε από τον Διαχειριστή Ασφάλειας Πληροφορικής. ' +
        'Αιτιολογία: *Παραβίαση πολιτικής — τα οικονομικά δεδομένα παραγωγής απαιτούν επιπλέον τεκμηρίωση*. ' +
        'Εξέτασε τη χρήση του staging replica.',
    },
    payload: {
      schema_version: '1.0',
      request_id: 'hitl-20260327-a4f91c',
      agent: {
        id: 'aria-data-assistant-v2',
        name: 'ARIA',
        callback_url: 'https://aria-backend.azurewebsites.net/hitl/callback',
      },
      requester: {
        user_id: 'sofia.papadaki@contoso.com',
        display_name: 'Sofia Papadaki',
        department: 'Data Analytics',
        role: 'junior-data-analyst',
      },
      action: {
        type: 'permission_grant',
        resource: 'prod-financial-reports-db',
        resource_type: 'azure_sql_database',
        permission_level: 'read',
        justification: 'Monthly P&L analysis — deadline end of March 2026',
        duration_hours: 24,
      },
      hitl: {
        required_approver_role: 'it-security-manager',
        urgency: 'high',
        sla_minutes: 120,
        escalation_role: 'ciso',
        channels: ['teams', 'sms'],
      },
      context: {
        risk_score: 0.78,
        risk_flags: ['production_resource', 'financial_data', 'pii_adjacent'],
        agent_confidence: 0.95,
      },
    },
  },

  {
    id: 1,
    trigger: 'άδεια',
    agentName: 'Πράκτορας Οικονομικών',
    requestId: 'hitl-20260327-b7e23f',
    urgency: 'medium',
    approverRole: 'finance-manager',
    escalationRole: 'cfo',
    slaMins: 240,
    ariaThink: 'Αξιολόγηση ενέργειας: παροχή άδειας λογισμικού — εκτιμώμενο κόστος €2.250/έτος…',
    ariaBlock:
      'Αυτό το αίτημα υπερβαίνει το **όριο αυτόματης έγκρισης των €500** (εκτιμώμενο κόστος: €2.250/έτος για 15 θέσεις). ' +
      'Απαιτείται έγκριση από Οικονομικό Διευθυντή πριν την παροχή. Κλιμάκωση προς HITL Gateway…',
    ariaResume: {
      approved:
        '✅ Έγινε! Παρέχονται 15 άδειες Adobe Creative Cloud για την ομάδα Marketing. ' +
        'Θα λάβουν email ενεργοποίησης μέσα στην επόμενη ώρα.',
      denied:
        '❌ Το αίτημα απορρίφθηκε. Αιτιολογία: *Περιορισμοί προϋπολογισμού — το τρέχον οικονομικό τρίμηνο είναι παγωμένο*. ' +
        'Εξέτασε αίτημα για μεμονωμένες άδειες όπου χρειάζεται.',
    },
    payload: {
      schema_version: '1.0',
      request_id: 'hitl-20260327-b7e23f',
      agent: {
        id: 'aria-procurement-v1',
        name: 'ARIA',
        callback_url: 'https://aria-backend.azurewebsites.net/hitl/callback',
      },
      requester: {
        user_id: 'sofia.papadaki@contoso.com',
        display_name: 'Sofia Papadaki',
        department: 'Data Analytics',
        role: 'junior-data-analyst',
      },
      action: {
        type: 'software_provisioning',
        resource: 'adobe-creative-cloud',
        vendor: 'Adobe',
        seats: 15,
        estimated_cost_eur: 2250,
        billing_period: 'annual',
        cost_center: 'MKT-001',
      },
      hitl: {
        required_approver_role: 'finance-manager',
        urgency: 'medium',
        sla_minutes: 240,
        escalation_role: 'cfo',
        channels: ['teams'],
      },
      context: {
        risk_score: 0.62,
        risk_flags: ['high_cost', 'bulk_license', 'budget_impact'],
        agent_confidence: 0.88,
        auto_approval_threshold_eur: 500,
      },
    },
  },

  {
    id: 2,
    trigger: 'ανάπτυξη',
    agentName: 'Πράκτορας Developer',
    requestId: 'hitl-20260327-c1d45a',
    urgency: 'high',
    approverRole: 'devops-lead',
    escalationRole: 'cto',
    slaMins: 30,
    ariaThink: 'Η ενέργεια επισημάνθηκε: ανάπτυξη παραγωγής — απαιτείται έγκριση από Επικεφαλής Developer',
    ariaBlock:
      'Οι αναπτύξεις παραγωγής απαιτούν **έγκριση Επικεφαλής Developer** σύμφωνα με την πολιτική διαχείρισης αλλαγών. ' +
      'Έχω κάνει παύση στο pipeline ανάπτυξης και ειδοποιώ τον on-call επικεφαλής μέσω HITL Gateway.',
    ariaResume: {
      approved:
        '✅ Η ανάπτυξη εγκρίθηκε! Γίνεται ανέβασμα του Evox στην παραγωγή. ' +
        'Εκτιμώμενος χρόνος: ~8 λεπτά. Θα σε ενημερώσω όταν τα pods είναι healthy.',
      denied:
        '❌ Η ανάπτυξη μπλοκαρίστηκε. Αιτιολογία: *Ενεργό change freeze — δεν επιτρέπονται αναπτύξεις παραγωγής μέχρι τη Δευτέρα*. ' +
        'Το pipeline έγινε rollback.',
    },
    payload: {
      schema_version: '1.0',
      request_id: 'hitl-20260327-c1d45a',
      agent: {
        id: 'epoptis-Developer-v3',
        name: 'EPOPTIS',
        callback_url: 'https://aria-backend.azurewebsites.net/hitl/callback',
      },
      requester: {
        user_id: 'papostol@evoxs.xyz',
        display_name: 'Gregory Papapostolou',
        department: 'Data Analytics',
        role: 'junior-data-analyst',
      },
      action: {
        type: 'deployment',
        target: 'production',
        cluster: 'aks-prod-westeurope',
        image_tag: 'v2.14.1',
        replicas: 6,
        rollback_plan: 'automatic_on_failure',
      },
      hitl: {
        required_approver_role: 'devops-lead',
        urgency: 'high',
        sla_minutes: 30,
        escalation_role: 'cto',
        channels: ['teams', 'sms'],
      },
      context: {
        risk_score: 0.85,
        risk_flags: ['production_deployment', 'infra_change', 'service_impact'],
        agent_confidence: 0.97,
        change_window: 'none_active',
      },
    },
  },

  {
    id: 3,
    trigger: 'pii',
    agentName: 'Πράκτορας Συμμόρφωσης',
    requestId: 'hitl-20260327-d9f01b',
    urgency: 'critical',
    approverRole: 'data-protection-officer',
    escalationRole: 'ceo',
    slaMins: 60,
    ariaThink: 'ΚΡΙΣΙΜΟ: Εξαγωγή δεδομένων PII σε εξωτερικό χώρο αποθήκευσης — ενέργεια ευαίσθητη ως προς το GDPR…',
    ariaBlock:
      '⚠️ Πρόκειται για **ΚΡΙΣΙΜΗ** ενέργεια: η εξαγωγή PII πελατών σε εξωτερικό προορισμό ενεργοποιεί ' +
      'τις απαιτήσεις του Άρθρου 28 GDPR. Απαιτείται έλεγχος από DPO και έγκριση διοίκησης. ' +
      'Κλιμάκωση προς HITL Gateway με μέγιστη προτεραιότητα.',
    ariaResume: {
      approved:
        '✅ Η εξαγωγή εγκρίθηκε με όρους. Ο DPO επιβεβαίωσε ότι υπάρχει συμφωνία επεξεργασίας δεδομένων. ' +
        'Εκκινεί κρυπτογραφημένη εξαγωγή με ενεργό audit logging.',
      denied:
        '❌ Η εξαγωγή απορρίφθηκε. Αιτιολογία: *Παραβίαση συμμόρφωσης GDPR — δεν υπάρχει ενεργή DPA με αυτόν τον συνεργάτη αναλύσεων*. ' +
        'Δεν μεταφέρθηκαν δεδομένα. Το συμβάν καταγράφηκε.',
    },
    payload: {
      schema_version: '1.0',
      request_id: 'hitl-20260327-d9f01b',
      agent: {
        id: 'aria-data-assistant-v2',
        name: 'ARIA',
        callback_url: 'https://aria-backend.azurewebsites.net/hitl/callback',
      },
      requester: {
        user_id: 'sofia.papadaki@contoso.com',
        display_name: 'Sofia Papadaki',
        department: 'Data Analytics',
        role: 'junior-data-analyst',
      },
      action: {
        type: 'data_export',
        dataset: 'customer-pii-full',
        destination_type: 'external_s3',
        destination_owner: 'analytics-partner-ltd',
        record_count: 148320,
        contains_pii: true,
        gdpr_applicable: true,
      },
      hitl: {
        required_approver_role: 'data-protection-officer',
        urgency: 'critical',
        sla_minutes: 60,
        escalation_role: 'ceo',
        channels: ['teams', 'sms', 'phone'],
      },
      context: {
        risk_score: 0.97,
        risk_flags: ['pii_export', 'external_destination', 'gdpr_article_28', 'critical_data'],
        agent_confidence: 0.99,
      },
    },
  },
];

/* ══════════════════════════════════════════════════════════
  ΚΑΤΑΣΤΑΣΗ ΑΙΤΗΜΑΤΩΝ ΣΤΗ ΜΝΗΜΗ
  Με κλειδί το id σεναρίου (0-3).
  status: 'pending' | 'approved' | 'denied'
══════════════════════════════════════════════════════════ */
const pending = new Map();

/* ══════════════════════════════════════════════════════════
  GET /api/start/:id
  Εκκινεί αίτημα HITL για το συγκεκριμένο σενάριο.
  Περιμένει χειροκίνητη απόφαση μέσω POST /api/decide/:id.
  Επιστρέφει όλο το αντικείμενο σεναρίου ώστε το frontend
  να εμφανίσει τα μηνύματα ariaThink / ariaBlock / ariaResume.
══════════════════════════════════════════════════════════ */
app.get('/api/start/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const scenario = SCENARIOS[id];

  if (!scenario) {
    return res.status(404).json({ error: `Δεν υπάρχει σενάριο με id ${id}` });
  }

  // Ακύρωση προηγούμενου timer για αυτό το slot
  if (pending.has(id)) {
    clearTimeout(pending.get(id).timeoutId);
  }

  pending.set(id, { status: 'pending', timeoutId: null });

  console.log(`[HITL] ξεκίνησε το σενάριο ${id} (${scenario.trigger}) — αναμονή χειροκίνητης απόφασης`);
  res.json(scenario);
});

/* ══════════════════════════════════════════════════════════
   POST /api/decide/:id
   Σώμα: { decision: 'approved' | 'denied' }
   Επιλύει χειροκίνητα ένα εκκρεμές αίτημα HITL.
══════════════════════════════════════════════════════════ */
app.post('/api/decide/:id', (req, res) => {
  const id    = parseInt(req.params.id, 10);
  const entry = pending.get(id);

  if (!entry) {
    return res.status(404).json({ error: `Δεν υπάρχει ενεργό αίτημα για το σενάριο ${id}` });
  }

  const { decision } = req.body;
  if (decision !== 'approved' && decision !== 'denied') {
    return res.status(400).json({ error: 'Το πεδίο decision πρέπει να είναι "approved" ή "denied"' });
  }

  entry.status = decision;
  console.log(`[HITL] σενάριο ${id} χειροκίνητα → ${decision}`);
  res.json({ ok: true, status: decision });
});

/* ══════════════════════════════════════════════════════════
   GET /api/approvalStatus/:id
   Επιστρέφει { status: 'pending' | 'approved' | 'denied' }
   Το frontend κάνει polling κάθε 2 δευτερόλεπτα μέχρι status !== 'pending'.
══════════════════════════════════════════════════════════ */
app.get('/api/approvalStatus/:id', (req, res) => {
  const id    = parseInt(req.params.id, 10);
  const entry = pending.get(id);

  if (!entry) {
    return res.status(404).json({ error: `Δεν υπάρχει ενεργό αίτημα για το σενάριο ${id}` });
  }

  res.json({ status: entry.status });
});

/* ══════════════════════════════════════════════════════════
   GET /api/logs
  Επιστρέφει μόνο τα σενάρια που έχουν εκκινηθεί.
══════════════════════════════════════════════════════════ */
app.get('/api/logs', (_req, res) => {
  const logs = [];
  for (const [sid, entry] of pending.entries()) {
    const scenario = SCENARIOS[sid];
    if (scenario) {
      logs.push({
        scenario_id:  sid,
        status:       entry.status,
        audit_trail:  [],
        payload:      scenario.payload,
      });
    }
  }
  res.json(logs);
});

/* ══════════════════════════════════════════════════════════
   GET /api/agents
  Επιστρέφει όλους τους καταχωρημένους πράκτορες με όνομα, κατηγορία και trigger.
══════════════════════════════════════════════════════════ */
app.get('/api/agents', (_req, res) => {
  const categoryById = {
    0: 'security',
    1: 'finance',
    2: 'devops',
    3: 'compliance',
  };

  const agents = SCENARIOS.map(s => ({
    id:       s.id,
    name:     s.agentName,
    trigger:  s.trigger,
    urgency:  s.urgency,
    category: categoryById[s.id] || 'security',
  }));
  res.json(agents);
});

/* ══════════════════════════════════════════════════════════
   ΕΚΚΙΝΗΣΗ
══════════════════════════════════════════════════════════ */
const PORT = 4050;
app.listen(PORT, () => {
  console.log(`Το backend του HITL Gateway ακούει στο http://localhost:${PORT}`);
  console.log('Διαθέσιμα endpoints:');
  console.log(`  GET /api/start/:id          — εκκίνηση αιτήματος HITL (id: 0-3)`);
  console.log(`  GET /api/approvalStatus/:id — polling για απόφαση`);
});
