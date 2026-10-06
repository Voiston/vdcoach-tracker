// Mémorise le client sélectionné pour le retrouver en changeant de vue (Progression / Objectifs / Bilans).
const CLE = 'vdcoach_client_courant'
export const lireClient = () => sessionStorage.getItem(CLE) ?? ''
export const memoriserClient = (id: string) => sessionStorage.setItem(CLE, id)
