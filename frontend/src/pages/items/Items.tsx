import { useEffect, useState, useRef } from 'react'
import { CheckSquare, Download, Edit2, ExternalLink, Loader2, Package, RefreshCw, Search, Square, Trash2, X, MessageSquare, ImagePlus } from 'lucide-react'
import { batchDeleteItems, deleteItem, fetchAllItemsFromAccount, getItems, updateItem, updateItemMultiQuantityDelivery, updateItemMultiSpec, getItemDefaultReply, saveItemDefaultReply, deleteItemDefaultReply, batchSaveItemDefaultReply, batchDeleteItemDefaultReply, uploadItemDefaultReplyImage } from '@/api/items'
import { getAccounts } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { PageLoading } from '@/components/common/Loading'
import { useAuthStore } from '@/store/authStore'
import { Select } from '@/components/common/Select'
import type { Account, Item } from '@/types'

export function Items() {
  const { addToast } = useUIStore()
  const { isAuthenticated, token, _hasHydrated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [fetching, setFetching] = useState(false)

  // 编辑弹窗状态
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editDetail, setEditDetail] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // 商品默认回复弹窗状态
  const [defaultReplyItem, setDefaultReplyItem] = useState<Item | null>(null)
  const [defaultReplyContent, setDefaultReplyContent] = useState('')
  const [defaultReplyImage, setDefaultReplyImage] = useState('')
  const [defaultReplyEnabled, setDefaultReplyEnabled] = useState(true)
  const [defaultReplyOnce, setDefaultReplyOnce] = useState(false)
  const [loadingDefaultReply, setLoadingDefaultReply] = useState(false)
  const [savingDefaultReply, setSavingDefaultReply] = useState(false)
  const [defaultReplyImageUploading, setDefaultReplyImageUploading] = useState(false)
  const defaultReplyImageInputRef = useRef<HTMLInputElement>(null)

  // 批量默认回复弹窗状态
  const [showBatchDefaultReplyModal, setShowBatchDefaultReplyModal] = useState(false)
  const [batchReplyContent, setBatchReplyContent] = useState('')
  const [batchReplyImage, setBatchReplyImage] = useState('')
  const [batchReplyEnabled, setBatchReplyEnabled] = useState(true)
  const [batchReplyOnce, setBatchReplyOnce] = useState(false)
  const [savingBatchReply, setSavingBatchReply] = useState(false)
  const [batchReplyImageUploading, setBatchReplyImageUploading] = useState(false)
  const batchReplyImageInputRef = useRef<HTMLInputElement>(null)

  // 删除确认状态
  const [deleteDefaultReplyConfirm, setDeleteDefaultReplyConfirm] = useState(false)
  const [batchDeleteDefaultReplyConfirm, setBatchDeleteDefaultReplyConfirm] = useState(false)

  const loadItems = async () => {
    if (!_hasHydrated || !isAuthenticated || !token) {
      return
    }
    try {
      setLoading(true)
      const result = await getItems(selectedAccount || undefined)
      if (result.success) {
        setItems(result.data || [])
      }
    } catch {
      addToast({ type: 'error', message: '加载商品列表失败' })
    } finally {
      setLoading(false)
    }
  }


  const handleFetchItems = async () => {
    if (!selectedAccount) {
      addToast({ type: 'warning', message: '请先选择账号后再获取商品' })
      return
    }

    setFetching(true)

    try {
      const result = await fetchAllItemsFromAccount(selectedAccount)

      if (result.success) {
        const totalCount = (result as { total_count?: number }).total_count || 0
        const savedCount = (result as { saved_count?: number }).saved_count || 0
        addToast({ type: 'success', message: `成功获取商品，共 ${totalCount} 件，保存 ${savedCount} 件` })
        await loadItems()
      } else {
        addToast({ type: 'error', message: (result as { message?: string }).message || '获取商品失败' })
      }
    } catch {
      addToast({ type: 'error', message: '获取商品失败' })
    } finally {
      setFetching(false)
    }
  }

  const loadAccounts = async () => {
    if (!_hasHydrated || !isAuthenticated || !token) {
      return
    }
    try {
      const data = await getAccounts()
      setAccounts(data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !token) return
    loadAccounts()
    loadItems()
  }, [_hasHydrated, isAuthenticated, token])

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !token) return
    loadItems()
  }, [_hasHydrated, isAuthenticated, token, selectedAccount])

  const handleDelete = async (item: Item) => {
    if (!confirm('确定要删除这个商品吗？')) return
    try {
      await deleteItem(item.cookie_id, item.item_id)
      addToast({ type: 'success', message: '删除成功' })
      loadItems()
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  // 批量选择相关
  const toggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      addToast({ type: 'warning', message: '请先选择要删除的商品' })
      return
    }
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个商品吗？`)) return
    try {
      const itemsToDelete = items
        .filter((item) => selectedIds.has(item.id))
        .map((item) => ({ cookie_id: item.cookie_id, item_id: item.item_id }))
      await batchDeleteItems(itemsToDelete)
      addToast({ type: 'success', message: `成功删除 ${selectedIds.size} 个商品` })
      setSelectedIds(new Set())
      loadItems()
    } catch {
      addToast({ type: 'error', message: '批量删除失败' })
    }
  }

  // 切换多数量发货状态
  const handleToggleMultiQuantity = async (item: Item) => {
    try {
      const newStatus = !item.multi_quantity_delivery
      await updateItemMultiQuantityDelivery(item.cookie_id, item.item_id, newStatus)
      addToast({ type: 'success', message: `多数量发货已${newStatus ? '开启' : '关闭'}` })
      loadItems()
    } catch {
      addToast({ type: 'error', message: '操作失败' })
    }
  }

  // 切换多规格状态
  const handleToggleMultiSpec = async (item: Item) => {
    try {
      const newStatus = !(item.is_multi_spec || item.has_sku)
      await updateItemMultiSpec(item.cookie_id, item.item_id, newStatus)
      addToast({ type: 'success', message: `多规格已${newStatus ? '开启' : '关闭'}` })
      loadItems()
    } catch {
      addToast({ type: 'error', message: '操作失败' })
    }
  }

  // 打开编辑弹窗
  const handleEdit = (item: Item) => {
    setEditingItem(item)
    setEditDetail(item.item_detail || item.desc || '')
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingItem) return
    setEditSaving(true)
    try {
      await updateItem(editingItem.cookie_id, editingItem.item_id, {
        item_detail: editDetail,
      })
      addToast({ type: 'success', message: '商品详情已更新' })
      setEditingItem(null)
      loadItems()
    } catch {
      addToast({ type: 'error', message: '更新失败' })
    } finally {
      setEditSaving(false)
    }
  }


  // 打开默认回复配置弹窗
  const handleOpenDefaultReply = async (item: Item) => {
    setDefaultReplyItem(item)
    setDefaultReplyImage('')
    setLoadingDefaultReply(true)
    
    try {
      const result = await getItemDefaultReply(item.cookie_id, item.item_id)
      if (result.success && result.data) {
        setDefaultReplyContent(result.data.reply_content || '')
        setDefaultReplyImage(result.data.reply_image || '')
        setDefaultReplyEnabled(result.data.enabled ?? true)
        setDefaultReplyOnce(result.data.reply_once ?? false)
      } else {
        setDefaultReplyContent('')
        setDefaultReplyImage('')
        setDefaultReplyEnabled(true)
        setDefaultReplyOnce(false)
      }
    } catch {
      setDefaultReplyContent('')
      setDefaultReplyImage('')
      setDefaultReplyEnabled(true)
      setDefaultReplyOnce(false)
    } finally {
      setLoadingDefaultReply(false)
    }
  }

  // 关闭默认回复配置弹窗
  const closeDefaultReply = () => {
    setDefaultReplyItem(null)
    setDefaultReplyContent('')
    setDefaultReplyImage('')
    setDefaultReplyEnabled(true)
    setDefaultReplyOnce(false)
    setDeleteDefaultReplyConfirm(false)
  }

  // 保存默认回复配置
  const handleSaveDefaultReply = async () => {
    if (!defaultReplyItem) return
    setSavingDefaultReply(true)
    
    try {
      await saveItemDefaultReply(defaultReplyItem.cookie_id, defaultReplyItem.item_id, {
        reply_content: defaultReplyContent,
        reply_image_url: defaultReplyImage,
        enabled: defaultReplyEnabled,
        reply_once: defaultReplyOnce
      })
      addToast({ type: 'success', message: '商品默认回复保存成功' })
      closeDefaultReply()
    } catch {
      addToast({ type: 'error', message: '保存失败' })
    } finally {
      setSavingDefaultReply(false)
    }
  }

  // 删除默认回复配置
  const handleDeleteDefaultReply = async () => {
    if (!defaultReplyItem) return
    
    try {
      await deleteItemDefaultReply(defaultReplyItem.cookie_id, defaultReplyItem.item_id)
      addToast({ type: 'success', message: '商品默认回复已删除' })
      closeDefaultReply()
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  // 上传默认回复图片
  const handleDefaultReplyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !defaultReplyItem) return
    
    setDefaultReplyImageUploading(true)
    try {
      const result = await uploadItemDefaultReplyImage(defaultReplyItem.cookie_id, defaultReplyItem.item_id, file)
      if (result.success && result.image_url) {
        setDefaultReplyImage(result.image_url)
        addToast({ type: 'success', message: '图片上传成功' })
      } else {
        addToast({ type: 'error', message: result.message || '图片上传失败' })
      }
    } catch {
      addToast({ type: 'error', message: '图片上传失败' })
    } finally {
      setDefaultReplyImageUploading(false)
      if (defaultReplyImageInputRef.current) {
        defaultReplyImageInputRef.current.value = ''
      }
    }
  }

  // 打开批量默认回复弹窗
  const handleOpenBatchDefaultReply = () => {
    if (selectedIds.size === 0) {
      addToast({ type: 'warning', message: '请先选择商品' })
      return
    }
    setBatchReplyContent('')
    setBatchReplyImage('')
    setBatchReplyEnabled(true)
    setBatchReplyOnce(false)
    setShowBatchDefaultReplyModal(true)
  }

  // 保存批量默认回复
  const handleSaveBatchDefaultReply = async () => {
    if (selectedIds.size === 0) return
    
    const selectedItems = items.filter((item) => selectedIds.has(item.id))
    const cookieId = selectedItems[0]?.cookie_id
    if (!cookieId) return
    
    // 检查是否所有选中的商品都属于同一个账号
    const allSameCookie = selectedItems.every((item) => item.cookie_id === cookieId)
    if (!allSameCookie) {
      addToast({ type: 'error', message: '批量操作只能针对同一账号的商品' })
      return
    }
    
    setSavingBatchReply(true)
    try {
      const itemIds = selectedItems.map((item) => item.item_id)
      await batchSaveItemDefaultReply(cookieId, {
        item_ids: itemIds,
        reply_content: batchReplyContent,
        reply_image_url: batchReplyImage,
        enabled: batchReplyEnabled,
        reply_once: batchReplyOnce
      })
      addToast({ type: 'success', message: `批量保存成功，共 ${itemIds.length} 个商品` })
      setShowBatchDefaultReplyModal(false)
      setSelectedIds(new Set())
    } catch {
      addToast({ type: 'error', message: '批量保存失败' })
    } finally {
      setSavingBatchReply(false)
    }
  }

  // 上传批量默认回复图片
  const handleBatchReplyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setBatchReplyImageUploading(true)
    try {
      // 使用通用图片上传接口
      const formData = new FormData()
      formData.append('image', file)
      const response = await fetch('/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      const result = await response.json()
      if (result.image_url) {
        setBatchReplyImage(result.image_url)
        addToast({ type: 'success', message: '图片上传成功' })
      } else {
        addToast({ type: 'error', message: result.detail || result.message || '图片上传失败' })
      }
    } catch {
      addToast({ type: 'error', message: '图片上传失败' })
    } finally {
      setBatchReplyImageUploading(false)
      if (batchReplyImageInputRef.current) {
        batchReplyImageInputRef.current.value = ''
      }
    }
  }

  // 批量删除默认回复
  const handleBatchDeleteDefaultReply = async () => {
    if (selectedIds.size === 0) return
    
    const selectedItems = items.filter((item) => selectedIds.has(item.id))
    const cookieId = selectedItems[0]?.cookie_id
    if (!cookieId) return
    
    const allSameCookie = selectedItems.every((item) => item.cookie_id === cookieId)
    if (!allSameCookie) {
      addToast({ type: 'error', message: '批量操作只能针对同一账号的商品' })
      return
    }
    
    try {
      const itemIds = selectedItems.map((item) => item.item_id)
      await batchDeleteItemDefaultReply(cookieId, itemIds)
      addToast({ type: 'success', message: `批量删除成功，共 ${itemIds.length} 个商品` })
      setBatchDeleteDefaultReplyConfirm(false)
      setSelectedIds(new Set())
    } catch {
      addToast({ type: 'error', message: '批量删除失败' })
    }
  }

  const filteredItems = items.filter((item) => {
    if (!searchKeyword) return true
    const keyword = searchKeyword.toLowerCase()
    const title = item.item_title || item.title || ''
    const desc = item.item_detail || item.desc || ''
    return (
      title.toLowerCase().includes(keyword) ||
      desc.toLowerCase().includes(keyword) ||
      item.item_id?.includes(keyword)
    )
  })

  if (loading) {
    return <PageLoading />
  }


  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header flex-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">商品管理</h1>
          <p className="page-description">管理各账号的商品信息</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <>
              <button onClick={handleOpenBatchDefaultReply} className="btn-ios-secondary">
                <MessageSquare className="w-4 h-4" />
                批量默认回复
              </button>
              <button onClick={() => setBatchDeleteDefaultReplyConfirm(true)} className="btn-ios-secondary">
                <Trash2 className="w-4 h-4" />
                批量删除回复
              </button>
              <button onClick={handleBatchDelete} className="btn-ios-danger">
                <Trash2 className="w-4 h-4" />
                删除选中 ({selectedIds.size})
              </button>
            </>
          )}
          <button
            onClick={handleFetchItems}
            disabled={fetching}
            className="btn-ios-primary"
          >
            {fetching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                获取中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                获取商品
              </>
            )}
          </button>
          <button onClick={loadItems} className="btn-ios-secondary">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="vben-card">
        <div className="vben-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">筛选账号</label>
              <Select
                value={selectedAccount}
                onChange={setSelectedAccount}
                options={[
                  { value: '', label: '所有账号' },
                  ...accounts.map((account) => ({
                    value: account.id,
                    label: account.id,
                  })),
                ]}
                placeholder="所有账号"
              />
            </div>
            <div className="input-group">
              <label className="input-label">搜索商品</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索商品标题或详情..."
                  className="input-ios pl-9"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="vben-card">
        <div className="vben-card-header">
          <h2 className="vben-card-title ">
            <Package className="w-4 h-4" />
            商品列表
          </h2>
          <span className="badge-primary">{filteredItems.length} 个商品</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-ios min-w-[1000px]">
            <thead>
              <tr>
                <th className="w-10 whitespace-nowrap">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:bg-gray-100 rounded"
                    title={selectedIds.size === filteredItems.length ? '取消全选' : '全选'}
                  >
                    {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="whitespace-nowrap">账号ID</th>
                <th className="whitespace-nowrap">商品ID</th>
                <th className="whitespace-nowrap">商品标题</th>
                <th className="whitespace-nowrap">价格</th>
                <th className="whitespace-nowrap">多规格</th>
                <th className="whitespace-nowrap">多数量发货</th>
                <th className="whitespace-nowrap">更新时间</th>
                <th className="whitespace-nowrap sticky right-0 bg-slate-50 dark:bg-slate-800">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state py-8">
                      <Package className="empty-state-icon" />
                      <p className="text-gray-500">暂无商品数据</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className={selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''}>
                    <td>
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {selectedIds.has(item.id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="font-medium text-blue-600 dark:text-blue-400">{item.cookie_id}</td>
                    <td className="text-xs text-gray-500">
                      <a
                        href={`https://www.goofish.com/item?id=${item.item_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-500 flex items-center gap-1"
                      >
                        {item.item_id}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="max-w-[280px]">
                      <div
                        className="font-medium line-clamp-2 cursor-help"
                        title={item.item_title || item.title || '-'}
                      >
                        {item.item_title || item.title || '-'}
                      </div>
                      {(item.item_detail || item.desc) && (
                        <div
                          className="text-xs text-gray-400 line-clamp-1 mt-0.5 cursor-help"
                          title={item.item_detail || item.desc}
                        >
                          {item.item_detail || item.desc}
                        </div>
                      )}
                    </td>
                    <td className="text-amber-600 font-medium">
                      {item.item_price || (item.price ? `¥${item.price}` : '-')}
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleMultiSpec(item)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          (item.is_multi_spec || item.has_sku)
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                        title={(item.is_multi_spec || item.has_sku) ? '点击关闭多规格' : '点击开启多规格'}
                      >
                        {(item.is_multi_spec || item.has_sku) ? '已开启' : '已关闭'}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleMultiQuantity(item)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          item.multi_quantity_delivery
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                        title={item.multi_quantity_delivery ? '点击关闭多数量发货' : '点击开启多数量发货'}
                      >
                        {item.multi_quantity_delivery ? '已开启' : '已关闭'}
                      </button>
                    </td>
                    <td className="text-gray-500 text-xs">
                      {item.updated_at ? new Date(item.updated_at).toLocaleString() : '-'}
                    </td>
                    <td className="sticky right-0 bg-white dark:bg-slate-900">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenDefaultReply(item)}
                          className="table-action-btn hover:!bg-green-50"
                          title="默认回复"
                        >
                          <MessageSquare className="w-4 h-4 text-green-500" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="table-action-btn hover:!bg-blue-50"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="table-action-btn hover:!bg-red-50"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* 编辑弹窗 */}
      {editingItem && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <h2 className="modal-title">编辑商品</h2>
              <button onClick={() => setEditingItem(null)} className="modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div className="input-group">
                <label className="input-label">商品ID</label>
                <input
                  type="text"
                  value={editingItem.item_id}
                  disabled
                  className="input-ios bg-slate-100 dark:bg-slate-700"
                />
              </div>
              <div className="input-group">
                <label className="input-label">商品标题</label>
                <input
                  type="text"
                  value={editingItem.item_title || editingItem.title || ''}
                  disabled
                  className="input-ios bg-slate-100 dark:bg-slate-700"
                />
              </div>
              <div className="input-group">
                <label className="input-label">商品详情</label>
                <textarea
                  value={editDetail}
                  onChange={(e) => setEditDetail(e.target.value)}
                  className="input-ios h-32 resize-none"
                  placeholder="输入商品详情..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="btn-ios-secondary"
                disabled={editSaving}
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="btn-ios-primary"
                disabled={editSaving}
              >
                {editSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </span>
                ) : (
                  '保存'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 商品默认回复配置弹窗 */}
      {defaultReplyItem && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <h2 className="modal-title">商品默认回复配置</h2>
              <button onClick={closeDefaultReply} className="modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body space-y-4">
              {loadingDefaultReply ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  <div className="input-group">
                    <label className="input-label">商品信息</label>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <div>ID: {defaultReplyItem.item_id}</div>
                      <div className="line-clamp-1">{defaultReplyItem.item_title || defaultReplyItem.title || '-'}</div>
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label className="input-label flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={defaultReplyEnabled}
                        onChange={(e) => setDefaultReplyEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      启用商品默认回复
                    </label>
                  </div>
                  
                  <div className="input-group">
                    <label className="input-label">回复内容</label>
                    <textarea
                      value={defaultReplyContent}
                      onChange={(e) => setDefaultReplyContent(e.target.value)}
                      className="input-ios h-24 resize-none"
                      placeholder="输入默认回复内容，支持变量：{send_user_name}、{send_user_id}、{send_message}、{item_id}"
                    />
                  </div>
                  
                  <div className="input-group">
                    <label className="input-label">回复图片</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={defaultReplyImage}
                        onChange={(e) => setDefaultReplyImage(e.target.value)}
                        className="input-ios flex-1"
                        placeholder="图片URL（可选）"
                      />
                      <input
                        type="file"
                        ref={defaultReplyImageInputRef}
                        onChange={handleDefaultReplyImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => defaultReplyImageInputRef.current?.click()}
                        disabled={defaultReplyImageUploading}
                        className="btn-ios-secondary"
                      >
                        {defaultReplyImageUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ImagePlus className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {defaultReplyImage && (
                      <div className="mt-2">
                        <img src={defaultReplyImage} alt="预览" className="max-h-24 rounded" />
                      </div>
                    )}
                  </div>
                  
                  <div className="input-group">
                    <label className="input-label flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={defaultReplyOnce}
                        onChange={(e) => setDefaultReplyOnce(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      只回复一次（同一用户只回复一次）
                    </label>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              {!deleteDefaultReplyConfirm ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDeleteDefaultReplyConfirm(true)}
                    className="btn-ios-danger mr-auto"
                    disabled={loadingDefaultReply || savingDefaultReply}
                  >
                    删除
                  </button>
                  <button
                    type="button"
                    onClick={closeDefaultReply}
                    className="btn-ios-secondary"
                    disabled={savingDefaultReply}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveDefaultReply}
                    className="btn-ios-primary"
                    disabled={loadingDefaultReply || savingDefaultReply}
                  >
                    {savingDefaultReply ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        保存中...
                      </span>
                    ) : (
                      '保存'
                    )}
                  </button>
                </>
              ) : (
                <>
                  <span className="text-red-500 text-sm">确定要删除此商品的默认回复配置吗？</span>
                  <button
                    type="button"
                    onClick={() => setDeleteDefaultReplyConfirm(false)}
                    className="btn-ios-secondary"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDeleteDefaultReply}
                    className="btn-ios-danger"
                  >
                    确认删除
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {/* 批量默认回复弹窗 */}
      {showBatchDefaultReplyModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <h2 className="modal-title">批量设置默认回复</h2>
              <button onClick={() => setShowBatchDefaultReplyModal(false)} className="modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                已选择 {selectedIds.size} 个商品
              </div>
              
              <div className="input-group">
                <label className="input-label flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={batchReplyEnabled}
                    onChange={(e) => setBatchReplyEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  启用默认回复
                </label>
              </div>
              
              <div className="input-group">
                <label className="input-label">回复内容</label>
                <textarea
                  value={batchReplyContent}
                  onChange={(e) => setBatchReplyContent(e.target.value)}
                  className="input-ios h-24 resize-none"
                  placeholder="输入默认回复内容，支持变量：{send_user_name}、{send_user_id}、{send_message}、{item_id}"
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">回复图片（可选）</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={batchReplyImage}
                    onChange={(e) => setBatchReplyImage(e.target.value)}
                    className="input-ios flex-1"
                    placeholder="图片URL，或点击上传按钮"
                  />
                  <input
                    type="file"
                    ref={batchReplyImageInputRef}
                    onChange={handleBatchReplyImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => batchReplyImageInputRef.current?.click()}
                    disabled={batchReplyImageUploading}
                    className="btn-ios-secondary"
                    title="上传图片"
                  >
                    {batchReplyImageUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImagePlus className="w-4 h-4" />
                    )}
                  </button>
                  {batchReplyImage && (
                    <button
                      onClick={() => setBatchReplyImage('')}
                      className="btn-ios-secondary text-red-500"
                      title="清除图片"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {batchReplyImage && (
                  <div className="mt-2">
                    <img src={batchReplyImage} alt="预览" className="max-h-24 rounded border" />
                  </div>
                )}
              </div>
              
              <div className="input-group">
                <label className="input-label flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={batchReplyOnce}
                    onChange={(e) => setBatchReplyOnce(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  只回复一次
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowBatchDefaultReplyModal(false)}
                className="btn-ios-secondary"
                disabled={savingBatchReply}
              >
                取消
              </button>
              <button
                onClick={handleSaveBatchDefaultReply}
                className="btn-ios-primary"
                disabled={savingBatchReply}
              >
                {savingBatchReply ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </span>
                ) : (
                  '批量保存'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除默认回复确认弹窗 */}
      {batchDeleteDefaultReplyConfirm && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h2 className="modal-title">确认删除</h2>
              <button onClick={() => setBatchDeleteDefaultReplyConfirm(false)} className="modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-gray-600 dark:text-gray-400">
                确定要删除选中的 {selectedIds.size} 个商品的默认回复配置吗？
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setBatchDeleteDefaultReplyConfirm(false)}
                className="btn-ios-secondary"
              >
                取消
              </button>
              <button
                onClick={handleBatchDeleteDefaultReply}
                className="btn-ios-danger"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
