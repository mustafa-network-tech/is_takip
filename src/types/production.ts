/** Tek bir imalat satırı (aynı başlık+ID altında birden fazla olabilir) */
export type ImalatLine = {
  id: string
  name: string
  quantity: string
  unit: string
  /** Boşsa kartta gösterilmez */
  material: string
}

/** Aynı adres / proje: başlık + ID + altında çoklu imalat */
export type ProjectGroup = {
  id: string
  title: string
  projectId: string
  lines: ImalatLine[]
}
