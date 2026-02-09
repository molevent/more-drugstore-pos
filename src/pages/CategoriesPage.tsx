import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { Plus, Edit, Trash2, X, AlertCircle, Pill, Stethoscope, Heart, Sparkles, UtensilsCrossed, Gift, ShoppingBag, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Category } from '../types/database'

export default function CategoriesPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    name_th: '',
    name_en: '',
    parent_id: ''
  })

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

  // Group categories by parent
  const mainCategories = categories.filter(c => !c.parent_id)
  const subCategories = categories.filter(c => c.parent_id)

  const getSubCategories = (parentId: string) => {
    return subCategories.filter(c => c.parent_id === parentId)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    resetForm()
  }

  // Get icon for main category based on name
  const getCategoryIcon = (nameTh: string) => {
    const name = nameTh.toLowerCase()
    if (name.includes('ยา') || name.includes('medicine') || name.includes('drug')) return <Pill className="h-5 w-5 text-blue-600" />
    if (name.includes('อุปกรณ์') || name.includes('equipment') || name.includes('medical')) return <Stethoscope className="h-5 w-5 text-green-600" />
    if (name.includes('วิตามิน') || name.includes('vitamin') || name.includes('supplement')) return <Heart className="h-5 w-5 text-red-500" />
    if (name.includes('ความงาม') || name.includes('beauty') || name.includes('cosmetic')) return <Sparkles className="h-5 w-5 text-purple-500" />
    if (name.includes('ชีวิตคู่') || name.includes('sexual') || name.includes('health')) return <Heart className="h-5 w-5 text-pink-500" />
    if (name.includes('อาหาร') || name.includes('food') || name.includes('beverage')) return <UtensilsCrossed className="h-5 w-5 text-orange-500" />
    if (name.includes('ของฝาก') || name.includes('souvenir') || name.includes('gift')) return <Gift className="h-5 w-5 text-teal-500" />
    return <ShoppingBag className="h-5 w-5 text-gray-500" />
  }

  // Toggle category expansion
  const toggleCategory = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            กลับ
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('categories.title')}</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="danger" 
            onClick={() => navigate('/products?filter=uncategorized')}
            className="w-full sm:w-auto"
          >
            <AlertCircle className="h-5 w-5 mr-2" />
            สินค้ายังไม่ตั้งหมวดหมู่
          </Button>
          <Button variant="primary" onClick={() => setShowModal(true)} className="w-full sm:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            {t('categories.addCategory')}
          </Button>
        </div>
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
          <div className="space-y-3">
            {mainCategories.map((mainCat) => {
              const children = getSubCategories(mainCat.id)
              const isExpanded = expandedCategories.has(mainCat.id)
              return (
                <div key={mainCat.id} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Main Category Header */}
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-white border-b">
                    <div 
                      className="flex-1 flex items-center gap-3 cursor-pointer"
                      onClick={() => navigate(`/products?category=${mainCat.id}`)}
                    >
                      {getCategoryIcon(mainCat.name_th)}
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{mainCat.name_th}</h2>
                        <p className="text-xs text-gray-500">{mainCat.name_en}</p>
                      </div>
                      {children.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {children.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {children.length > 0 && (
                        <button
                          onClick={(e) => toggleCategory(mainCat.id, e)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title={isExpanded ? "ซ่อนหมวดหมู่ย่อย" : "แสดงหมวดหมู่ย่อย"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </button>
                      )}
                      <button 
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded"
                        onClick={() => handleEdit(mainCat)}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                        onClick={() => handleDelete(mainCat.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Sub Categories - Larger Horizontal Chips (Collapsible) */}
                  {children.length > 0 && isExpanded && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100">
                      <p className="text-sm text-gray-600 mb-3 font-medium">หมวดหมู่ย่อย:</p>
                      <div className="flex flex-wrap gap-3">
                        {children.map((subCat) => {
                          const grandChildren = getSubCategories(subCat.id)
                          return (
                            <div key={subCat.id} className="group">
                              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all overflow-hidden">
                                {/* Main subcategory button */}
                                <button
                                  onClick={() => navigate(`/products?category=${subCat.id}`)}
                                  className="px-4 py-3 text-left min-w-[120px]"
                                >
                                  <span className="font-medium text-gray-800 text-base">{subCat.name_th}</span>
                                  {grandChildren.length > 0 && (
                                    <span className="text-sm text-gray-500 ml-1">({grandChildren.length})</span>
                                  )}
                                </button>
                                {/* Actions - always visible on mobile, hover on desktop */}
                                <div className="flex border-l border-gray-100">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEdit(subCat)
                                    }}
                                    className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDelete(subCat.id)
                                    }}
                                    className="p-3 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              {/* Grand Children Tags */}
                              {grandChildren.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2 ml-1">
                                  {grandChildren.map((grandChild) => (
                                    <button
                                      key={grandChild.id}
                                      onClick={() => navigate(`/products?category=${grandChild.id}`)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-sm text-blue-700 hover:text-blue-800 rounded-lg transition-colors font-medium"
                                    >
                                      {grandChild.name_th}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

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
