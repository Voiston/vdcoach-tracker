export const MSG_RESEAU = 'Connexion impossible. Vérifie ton réseau puis réessaie.'
export const MSG_SERVEUR = 'Le service ne répond pas pour le moment. Réessaie dans un instant.'
export const MSG_SESSION = 'Ta session a expiré. Reconnecte-toi.'

type Erreur = { code?: string; message?: string; status?: number }

// Transforme une erreur technique (Supabase, réseau…) en message clair en français.
export function messageErreur(e: unknown): string {
  const { code = '', message = '', status } = (e ?? {}) as Erreur
  const texte = message.toLowerCase()

  if (/failed to fetch|networkerror|load failed|network request failed/.test(texte)) return MSG_RESEAU
  if (code === 'PGRST301' || /jwt expired|invalid jwt|not authenticated/.test(texte) || status === 401) return MSG_SESSION
  if (code === '42501' || /row-level security|permission denied/.test(texte)) return 'Accès refusé. Reconnecte-toi, ou valide ta double authentification.'
  if (code === 'over_request_rate_limit' || status === 429) return 'Trop de tentatives. Patiente un moment puis réessaie.'
  if (code === '23505') return 'Cet élément existe déjà.'
  if (code === '23503') return 'Cet élément est lié à d’autres données et ne peut pas être modifié ainsi.'
  if (code === '23502') return 'Un champ obligatoire est vide.'
  if (['23514', '22P02', '22003'].includes(code)) return 'Une des valeurs saisies n’est pas valide.'
  if ((typeof status === 'number' && status >= 500) || /^5\d\d$/.test(code)) return MSG_SERVEUR

  console.error(e) // trace technique pour le débogage, jamais affichée
  return 'Une erreur est survenue. Réessaie dans un instant.'
}
