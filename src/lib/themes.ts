export type Modo = 'claro' | 'oscuro'

export interface TemaInfo {
  id: string
  nombre: string
  descripcion: string
  daltonismo: boolean
}

export const TEMAS: TemaInfo[] = [
  { id: 'neutro', nombre: 'Neutro', descripcion: 'Grises + acento azul', daltonismo: false },
  { id: 'calido', nombre: 'Cálido', descripcion: 'Tierra + naranja', daltonismo: false },
  { id: 'frio', nombre: 'Frío', descripcion: 'Azul/verde + cian', daltonismo: false },
  { id: 'oscuro-profundo', nombre: 'Oscuro profundo', descripcion: 'Casi negro + violeta', daltonismo: false },
  { id: 'claro-suave', nombre: 'Claro suave', descripcion: 'Blanco roto + verde', daltonismo: false },
  { id: 'protanopia', nombre: 'Protanopia', descripcion: 'Azul-naranja, luminancia', daltonismo: true },
  { id: 'deuteranopia', nombre: 'Deuteranopia', descripcion: 'Azul-naranja (par seguro)', daltonismo: true },
  { id: 'tritanopia', nombre: 'Tritanopia', descripcion: 'Rojo-naranja vs azul-verde', daltonismo: true },
  { id: 'alto-contraste', nombre: 'Alto contraste', descripcion: 'Blanco/negro puro, bordes gruesos', daltonismo: true }
]

export const TEMA_DEFAULT = 'neutro'
export const MODO_DEFAULT: Modo = 'claro'

export const LS_TEMA = 'cliwf.tema'
export const LS_MODO = 'cliwf.modo'
