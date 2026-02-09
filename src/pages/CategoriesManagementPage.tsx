import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../services/supabase'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { Plus, Edit, Trash2, X, Pill, Stethoscope, Heart, Sparkles, UtensilsCrossed, Gift, ShoppingBag, ChevronDown, ChevronRight, ArrowLeft, FolderTree } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Category } from '../types/database'

export default function CategoriesManagementPage() {
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
        ? Math.max(...categories.map(c => c.sort_order || 0))
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
        alert(t('categories.updateSuccess'))
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([categoryData])
        
        if (error) throw error
        alert(t('categories.addSuccess'))
      }

      setShowModal(false)
      setFormData({ name_th: '', name_en: '', parent_id: '' })
      setEditingCategory(null)
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

  // Get main categories (no parent)
  const mainCategories = categories.filter(c => !c.parent_id)

  // Get subcategories for a parent
  const getSubCategories = (parentId: string) => {
    return categories.filter(c => c.parent_id === parentId)
  }

  // Get icon based on category name
  const getCategoryIcon = (name: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'ยา': <Pill className="h-5 w-5 text-blue-500" />,
      'Pharmacy': <Pill className="h-5 w-5 text-blue-500" />,
      'อุปกรณ์': <Stethoscope className="h-5 w-5 text-green-500" />,
      'Medical': <Stethoscope className="h-5 w-5 text-green-500" />,
      'วิตามิน': <Heart className="h-5 w-5 text-red-500" />,
      'Vitamin': <Heart className="h-5 w-5 text-red-500" />,
      'ความงาม': <Sparkles className="h-5 w-5 text-purple-500" />,
      'Beauty': <Sparkles className="h-5 w-5 text-purple-500" />,
      'อาหาร': <UtensilsCrossed className="h-5 w-5 text-orange-500" />,
      'Food': <UtensilsCrossed className="h-5 w-5 text-orange-500" />,
      'ของขวัญ': <Gift className="h-5 w-5 text-pink-500" />,
      'Gift': <Gift className="h-5 w-5 text-pink-500" />,
      'ทั่วไป': <ShoppingBag className="h-5 w-5 text-gray-500" />,
      'General': <ShoppingBag className="h-5 w-5 text-gray-500" />,
    }
    
    for (const [key, icon] of Object.entries(iconMap)) {
      if (name.toLowerCase().includes(key.toLowerCase())) {
        return icon
      }
    }
    return <FolderTree className="h-5 w-5 text-gray-500" />
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FolderTree className="h-7 w-7 text-blue-600" />
            {t('categories.title')}
          </h1>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)} className="w-full sm:w-auto">
          <Plus className="h-5 w-5 mr-2" />
          เพิ่มหมวดหมู่
        </Button>
      </div>

      {/* Categories Grid */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลด...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>ไม่มีหมวดหมู่</p>
            <p className="text-sm mt-2">เพิ่มหมวดหมู่ใหม่</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {mainCategories.map((mainCat) => {
              const children = getSubCategories(mainCat.id)
              const isExpanded = expandedCategories.has(mainCat.id)
              return (
                <div key={mainCat.id} className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                  {/* Main Category Header */}
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-white border-b">
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <div className="flex-shrink-0">
                        {getCategoryIcon(mainCat.name_th)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-gray-900 truncate">{mainCat.name_th}</h2>
                        <p className="text-xs text-gray-500 truncate">{mainCat.name_en}</p>
                      </div>
                      {children.length > 0 && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {children.length}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions Row */}
                  <div className="flex items-center justify-between p-2 bg-gray-50">
                    <div className="flex items-center gap-1">
                      {children.length > 0 && (
                        <button
                          onClick={(e) => toggleCategory(mainCat.id, e)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title={isExpanded ? "ซ่อนหมวดหมู่ย่อย" : "แสดงหมวดหมู่ย่อย"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded"
                        onClick={() => handleEdit(mainCat)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                        onClick={() => handleDelete(mainCat.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Sub Categories - Collapsible */}
                  {children.length > 0 && isExpanded && (
                    <div className="p-2 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs text-gray-600 mb-2 font-medium">หมวดหมู่ย่อย:</p>
                      <div className="space-y-1">
                        {children.map((subCat) => {
                          const grandChildren = getSubCategories(subCat.id)
                          return (
                            <div key={subCat.id} className="group">
                              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all overflow-hidden">
                                <button
                                  onClick={() => navigate(`/products?category=${subCat.id}`)}
                                  className="flex-1 px-2 py-1.5 text-left text-sm"
                                >
                                  <span className="font-medium text-gray-800">{subCat.name_th}</span>
                                  {grandChildren.length > 0 && (
                                    <span className="text-xs text-gray-500 ml-1">({grandChildren.length})</span>
                                  )}
                                </button>
                                <div className="flex items-center gap-0.5 pr-1">
                                  <button 
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded"
                                    onClick={() => handleEdit(subCat)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button 
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                                    onClick={() => handleDelete(subCat.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Grandchildren */}
                              {grandChildren.length > 0 && (
                                <div className="ml-3 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                                  {grandChildren.map((grandChild) => (
                                    <div 
                                      key={grandChild.id} 
                                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 hover:border-blue-300 transition-colors"
                                    >
                                      <button
                                        onClick={() => navigate(`/products?category=${grandChild.id}`)}
                                        className="text-left text-xs text-gray-700 flex-1"
                                      >
                                        {grandChild.name_th}
                                      </button>
                                      <div className="flex items-center gap-0.5">
                                        <button 
                                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                          onClick={() => handleEdit(grandChild)}
                                        >
                                          <Edit className="h-2.5 w-2.5" />
                                        </button>
                                        <button 
                                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                                          onClick={() => handleDelete(grandChild.id)}
                                        >
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    </div>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? t('categories.editTitle') : t('categories.addTitle')}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingCategory(null)
                  setFormData({ name_th: '', name_en: '', parent_id: '' })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อหมวดหมู่ (ภาษาไทย) *
                  </label>
                  <Input
                    type="text"
                    value={formData.name_th}
                    onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อหมวดหมู่ (ภาษาอังกฤษ)
                  </label>
                  <Input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    หมวดหมู่หลัก (ถ้ามี)
                  </label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">ไม่มี (เป็นหมวดหมู่หลัก)</option>
                    {categories
                      .filter(c => c.id !== editingCategory?.id)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name_th}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowModal(false)
                    setEditingCategory(null)
                    setFormData({ name_th: '', name_en: '', parent_id: '' })
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  {editingCategory ? t('common.save') : t('common.add')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
