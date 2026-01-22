import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { Plus, Edit, Trash2, X, GripVertical } from 'lucide-react'
import type { Category } from '../types/database'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function CategoriesPage() {
  const { t } = useLanguage()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name_th: '',
    name_en: '',
    parent_id: ''
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order')
      
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Calculate next sort_order
      const maxSortOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.sort_order))
        : 0
      
      const categoryData = {
        name_th: formData.name_th,
        name_en: formData.name_en,
        parent_id: formData.parent_id || null,
        sort_order: editingCategory ? editingCategory.sort_order : maxSortOrder + 1
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([categoryData])
        
        if (error) throw error
      }

      alert(t('categories.saveSuccess'))
      setShowModal(false)
      resetForm()
      fetchCategories()
    } catch (error: any) {
      console.error('Error saving category:', error)
      alert(error.message)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name_th: category.name_th,
      name_en: category.name_en,
      parent_id: category.parent_id || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('categories.confirmDelete'))) return
    
    try {
      // First check if category has products
      const { data: products, error: checkError } = await supabase
        .from('products')
        .select('id')
        .eq('category_id', id)
      
      if (checkError) throw checkError
      
      if (products && products.length > 0) {
        alert(t('categories.hasProducts').replace('{count}', products.length.toString()))
        return
      }
      
      // If no products, proceed with deletion
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      alert(t('categories.deleteSuccess'))
      fetchCategories()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      // Check if error is from trigger
      if (error.message?.includes('products are using this category')) {
        const match = error.message.match(/(\d+) products/)
        const count = match ? match[1] : 'some'
        alert(t('categories.hasProducts').replace('{count}', count))
      } else {
        alert(error.message)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name_th: '',
      name_en: '',
      parent_id: ''
    })
    setEditingCategory(null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id)
      const newIndex = categories.findIndex((cat) => cat.id === over.id)

      const newCategories = arrayMove(categories, oldIndex, newIndex)
      setCategories(newCategories)

      // Update sort_order in database
      try {
        const updates = newCategories.map((cat, index) => ({
          id: cat.id,
          sort_order: index
        }))

        for (const update of updates) {
          await supabase
            .from('categories')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id)
        }
      } catch (error) {
        console.error('Error updating sort order:', error)
        fetchCategories() // Reload on error
      }
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    resetForm()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('categories.title')}</h1>
        <Button variant="primary" onClick={() => setShowModal(true)} className="w-full sm:w-auto">
          <Plus className="h-5 w-5 mr-2" />
          {t('categories.addCategory')}
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('categories.loading')}</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>{t('categories.noCategories')}</p>
            <p className="text-sm mt-2">{t('categories.addCategoryPrompt')}</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 w-12"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('categories.nameTh')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('categories.nameEn')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('categories.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <SortableContext
                    items={categories.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {categories.map((category) => (
                      <SortableRow
                        key={category.id}
                        category={category}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        t={t}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </div>
          </DndContext>
        )}
      </Card>

      {/* Make table responsive on mobile */}
      <style>{`
        @media (max-width: 640px) {
          .overflow-x-auto {
            margin-left: -1rem;
            margin-right: -1rem;
          }
        }
      `}</style>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? t('categories.editCategory') : t('categories.addCategory')}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t('categories.nameTh')}
                value={formData.name_th}
                onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                required
              />

              <Input
                label={t('categories.nameEn')}
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('categories.parentCategory')}
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="">{t('categories.noParent')}</option>
                  {categories
                    .filter(c => c.id !== editingCategory?.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name_th}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" variant="primary" className="flex-1">
                  {t('common.save')}
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleCloseModal}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Sortable Row Component
function SortableRow({ 
  category, 
  onEdit, 
  onDelete, 
  t 
}: { 
  category: Category
  onEdit: (category: Category) => void
  onDelete: (id: string) => void
  t: (key: string) => string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'bg-blue-50' : ''}>
      <td className="px-4 py-4 whitespace-nowrap">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-5 w-5" />
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {category.name_th}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {category.name_en}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => onEdit(category)}
        >
          <Edit className="h-4 w-4 mr-1" />
          {t('categories.edit')}
        </Button>
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => onDelete(category.id)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {t('categories.delete')}
        </Button>
      </td>
    </tr>
  )
}
