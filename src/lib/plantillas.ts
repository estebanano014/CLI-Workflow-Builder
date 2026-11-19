/**
 * Plantillas de inicio: rutas y recetas de ejemplo para crear en un clic.
 * Son datos estáticos (offline) que se materializan con ids y fechas nuevas.
 */
import type { Receta, Ruta, SO } from '@/lib/types'
import { uid } from '@/lib/utils'

export interface PlantillaPaso {
  titulo: string
  descripcion?: string
  comando: string
  so?: SO
  nota?: string
  esDestructivo?: boolean
}

export interface PlantillaRuta {
  nombre: string
  descripcion: string
  icono: string
  color: string
  etiquetas: string[]
  pasos: PlantillaPaso[]
}

export interface PlantillaReceta {
  titulo: string
  descripcion: string
  entrada?: string
  salida?: string
  etiquetas: string[]
  pasos: string[]
}

export function rutaDesdePlantilla(p: PlantillaRuta, nombre: string, soPreferido: SO): Ruta {
  const ahora = new Date().toISOString()
  return {
    id: uid(),
    nombre,
    descripcion: p.descripcion,
    etiquetas: p.etiquetas,
    favorito: false,
    color: p.color,
    icono: p.icono,
    createdAt: ahora,
    updatedAt: ahora,
    lastRunAt: null,
    variables: [],
    pasos: p.pasos.map((paso) => ({
      id: uid(),
      titulo: paso.titulo,
      descripcion: paso.descripcion ?? '',
      esDestructivo: paso.esDestructivo ?? false,
      variantes: [
        { id: uid(), so: paso.so ?? soPreferido, comando: paso.comando, nota: paso.nota ?? '', esAlternativo: false }
      ]
    }))
  }
}

export function recetaDesdePlantilla(p: PlantillaReceta, titulo: string): Receta {
  const ahora = new Date().toISOString()
  return {
    id: uid(),
    titulo,
    descripcion: p.descripcion,
    entrada: p.entrada ?? '',
    salida: p.salida ?? '',
    etiquetas: p.etiquetas,
    favorito: false,
    createdAt: ahora,
    updatedAt: ahora,
    lastRunAt: null,
    pasos: p.pasos.map((texto) => ({ id: uid(), texto }))
  }
}

/** Devuelve un nombre único añadiendo « (n)» si el base ya existe. */
export function nombreUnico(base: string, existentes: string[]): string {
  const cmp = (s: string) => s.trim().toLowerCase()
  if (!existentes.some((n) => cmp(n) === cmp(base))) return base
  let i = 2
  while (existentes.some((n) => cmp(n) === cmp(`${base} (${i})`))) i++
  return `${base} (${i})`
}

export const PLANTILLAS_RUTAS: PlantillaRuta[] = [
  {
    nombre: 'Inicializar proyecto Git',
    descripcion: 'Crea un repositorio y sube el primer commit.',
    icono: 'git-alt',
    color: '#f05033',
    etiquetas: ['git'],
    pasos: [
      { titulo: 'Inicializar el repositorio', comando: 'git init', so: 'any' },
      { titulo: 'Preparar los cambios', comando: 'git add .', so: 'any' },
      { titulo: 'Confirmar los cambios', comando: 'git commit -m "primer commit"', so: 'any' },
      { titulo: 'Subir al remoto', comando: 'git push -u origin main', so: 'any' }
    ]
  },
  {
    nombre: 'Desplegar a producción',
    descripcion: 'Compila, ejecuta los tests y despliega.',
    icono: 'server',
    color: '#2563eb',
    etiquetas: ['deploy', 'prod'],
    pasos: [
      { titulo: 'Instalar dependencias', comando: 'npm install', so: 'any' },
      { titulo: 'Ejecutar los tests', comando: 'npm test', so: 'any' },
      { titulo: 'Compilar', comando: 'npm run build', so: 'any' },
      { titulo: 'Desplegar', comando: 'npm run deploy', nota: 'Ajusta al script real de tu proyecto.' }
    ]
  },
  {
    nombre: 'Diagnóstico de red',
    descripcion: 'Comprueba conectividad y configuración de red.',
    icono: 'cloud',
    color: '#0e7490',
    etiquetas: ['red', 'diagnóstico'],
    pasos: [
      { titulo: 'Comprobar conectividad', comando: 'ping 8.8.8.8', so: 'any' },
      { titulo: 'Ver la IP local', comando: 'ipconfig', so: 'windows' },
      { titulo: 'Trazar la ruta', comando: 'tracert google.com', so: 'windows' }
    ]
  }
]

export const PLANTILLAS_RECETAS: PlantillaReceta[] = [
  {
    titulo: 'Validar una contraseña',
    descripcion: 'Comprueba que una contraseña cumple una política básica.',
    entrada: 'texto (contraseña)',
    salida: 'booleano',
    etiquetas: ['validación'],
    pasos: [
      'Comprobar que la longitud es al menos 8 caracteres.',
      'Comprobar que no empieza ni termina con espacios.',
      'Comprobar que no supera los 128 caracteres.',
      'Devolver true si cumple todas las reglas.'
    ]
  },
  {
    titulo: 'Determinar si un número es primo',
    descripcion: 'Algoritmo simple de primalidad.',
    entrada: 'número entero n',
    salida: 'booleano',
    etiquetas: ['algoritmo'],
    pasos: [
      'Si n es menor que 2, devolver false.',
      'Recorrer los divisores desde 2 hasta la raíz cuadrada de n.',
      'Si algún divisor divide exactamente a n, devolver false.',
      'Devolver true si no se encontró ningún divisor.'
    ]
  },
  {
    titulo: 'Ordenar una lista',
    descripcion: 'Estrategia general para ordenar una colección.',
    entrada: 'lista de elementos comparables',
    salida: 'lista ordenada',
    etiquetas: ['algoritmo'],
    pasos: [
      'Elegir un criterio de comparación entre elementos.',
      'Aplicar un algoritmo de ordenación (burbuja, mergesort, etc.).',
      'Verificar que la salida está ordenada según el criterio.',
      'Manejar el caso de lista vacía o con un solo elemento.'
    ]
  }
]
