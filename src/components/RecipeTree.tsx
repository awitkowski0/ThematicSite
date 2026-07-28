import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { RecipeIngredient, getRecipeNode } from '../lib/suits'
import { stripNamespace } from '../lib/format'
import { ItemIcon } from './controls'

export function RecipeTree({ ingredients, ancestors = [] }: { ingredients: RecipeIngredient[]; ancestors?: string[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {ingredients.map((ingredient) => (
        <IngredientRow key={ingredient.id} ingredient={ingredient} ancestors={ancestors} />
      ))}
    </ul>
  )
}

function IngredientRow({ ingredient, ancestors }: { ingredient: RecipeIngredient; ancestors: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const isCircular = ancestors.includes(ingredient.id)
  const node = !ingredient.isSuit && !isCircular ? getRecipeNode(ingredient.id) : undefined
  const expandable = Boolean(node)

  const icon = <ItemIcon path={ingredient.iconPath} />

  const label = (
    <span>
      {ingredient.name} <span className="text-neutral-500">×{ingredient.count}</span>
    </span>
  )

  return (
    <li>
      {ingredient.isSuit ? (
        <Link
          to="/suits/$id"
          params={{ id: stripNamespace(ingredient.id) }}
          className="flex items-center gap-2 rounded-md border border-neutral-200 p-2 text-sm hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
        >
          {icon}
          {label}
          <span className="ml-auto text-xs text-neutral-500">suit →</span>
        </Link>
      ) : expandable ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-2 rounded-md border border-neutral-200 p-2 text-left text-sm hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
        >
          {icon}
          {label}
          <span className="ml-auto text-xs text-neutral-500">{expanded ? '▲' : '▼'}</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-neutral-200 p-2 text-sm dark:border-neutral-800">
          {icon}
          {label}
        </div>
      )}

      {expanded && node && (
        <div className="mt-2 ml-4 border-l border-neutral-200 pl-3 dark:border-neutral-800">
          <RecipeTree ingredients={node.ingredients} ancestors={[...ancestors, ingredient.id]} />
        </div>
      )}
    </li>
  )
}
