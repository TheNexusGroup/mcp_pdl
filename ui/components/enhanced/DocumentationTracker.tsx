'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Plus, 
  X, 
  ExternalLink,
  Check,
  AlertTriangle,
  Folder,
  Tag,
  Calendar,
  User,
  Search,
  Filter,
  Download
} from 'lucide-react'
import { DocumentReference, DocumentCategory, SupportingDocumentation } from '@/lib/types/pdl-types'
import { Button } from '@/components/ui/button'

// Utility functions
const getCategoryIcon = (category: DocumentCategory) => {
  const icons = {
    requirement: '📋',
    design: '🎨',
    specification: '📝',
    test_plan: '🧪',
    meeting_notes: '📅',
    decision_record: '⚖️',
    architecture: '🏗️',
    user_story: '👤',
    acceptance_criteria: '✅',
    research: '🔍',
    reference: '📚',
    other: '📄'
  }
  return icons[category] || '📄'
}

const getCategoryColor = (category: DocumentCategory) => {
  const colors = {
    requirement: 'bg-blue-100 text-blue-800 border-blue-200',
    design: 'bg-purple-100 text-purple-800 border-purple-200',
    specification: 'bg-green-100 text-green-800 border-green-200',
    test_plan: 'bg-orange-100 text-orange-800 border-orange-200',
    meeting_notes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    decision_record: 'bg-red-100 text-red-800 border-red-200',
    architecture: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    user_story: 'bg-pink-100 text-pink-800 border-pink-200',
    acceptance_criteria: 'bg-green-100 text-green-800 border-green-200',
    research: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    reference: 'bg-gray-100 text-gray-800 border-gray-200',
    other: 'bg-slate-100 text-slate-800 border-slate-200'
  }
  return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200'
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return 'Unknown size'
  
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

interface DocumentationTrackerProps {
  documentation?: SupportingDocumentation
  contextType: 'project' | 'phase' | 'sprint' | 'task'
  contextId: string
  onAddDocument?: (document: Omit<DocumentReference, 'added_at' | 'added_by' | 'verified'>) => void
  onRemoveDocument?: (documentPath: string) => void
  onUpdateDocument?: (documentPath: string, updates: Partial<DocumentReference>) => void
  readOnly?: boolean
}

export function DocumentationTracker({
  documentation,
  contextType,
  contextId,
  onAddDocument,
  onRemoveDocument,
  onUpdateDocument,
  readOnly = false
}: DocumentationTrackerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'category' | 'size'>('date')

  const documents = documentation?.documents || []

  // Filter and sort documents
  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = searchTerm === '' || 
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.filename.localeCompare(b.filename)
        case 'date':
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
        case 'category':
          return a.category.localeCompare(b.category)
        case 'size':
          return (b.size_bytes || 0) - (a.size_bytes || 0)
        default:
          return 0
      }
    })


  const openDocument = async (doc: DocumentReference) => {
    try {
      // Check if it's a web URL
      if (doc.path.startsWith('http://') || doc.path.startsWith('https://')) {
        window.open(doc.path, '_blank')
        return
      }

      // For local files, we'd typically want to open them in the system default application
      // This would require electron or similar integration
      console.log('Opening document:', doc.absolute_path)
      
      // For now, just copy the path to clipboard
      await navigator.clipboard.writeText(doc.absolute_path)
      
      // Show notification
      // Could integrate with the notification system here
    } catch (error) {
      console.error('Failed to open document:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Supporting Documentation
          </h3>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {!readOnly && (
          <Button
            onClick={() => setShowAddDialog(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Document
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      {documents.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory | 'all')}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="requirement">📋 Requirements</option>
            <option value="design">🎨 Design</option>
            <option value="specification">📝 Specifications</option>
            <option value="test_plan">🧪 Test Plans</option>
            <option value="meeting_notes">📅 Meeting Notes</option>
            <option value="decision_record">⚖️ Decision Records</option>
            <option value="architecture">🏗️ Architecture</option>
            <option value="user_story">👤 User Stories</option>
            <option value="acceptance_criteria">✅ Acceptance Criteria</option>
            <option value="research">🔍 Research</option>
            <option value="reference">📚 Reference</option>
            <option value="other">📄 Other</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="category">Sort by Category</option>
            <option value="size">Sort by Size</option>
          </select>
        </div>
      )}

      {/* Documents List */}
      {filteredDocuments.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredDocuments.map((doc, index) => (
              <DocumentCard
                key={doc.path}
                document={doc}
                index={index}
                onOpen={() => openDocument(doc)}
                onRemove={!readOnly ? () => onRemoveDocument?.(doc.path) : undefined}
                onUpdate={!readOnly ? (updates) => onUpdateDocument?.(doc.path, updates) : undefined}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : documents.length > 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No matching documents</h4>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No documentation added</h4>
          <p className="mb-6">Start by adding important documents that support this {contextType}.</p>
          {!readOnly && (
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Document
            </Button>
          )}
        </div>
      )}

      {/* Add Document Dialog */}
      <AnimatePresence>
        {showAddDialog && (
          <AddDocumentDialog
            onClose={() => setShowAddDialog(false)}
            onAdd={(doc) => {
              onAddDocument?.(doc)
              setShowAddDialog(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Document Card Component
interface DocumentCardProps {
  document: DocumentReference
  index: number
  onOpen: () => void
  onRemove?: () => void
  onUpdate?: (updates: Partial<DocumentReference>) => void
}

function DocumentCard({ document, index, onOpen, onRemove, onUpdate }: DocumentCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      className={`p-4 bg-white border rounded-lg hover:shadow-md transition-all ${
        document.verified ? 'border-gray-200' : 'border-yellow-300 bg-yellow-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-lg">{getCategoryIcon(document.category)}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">{document.filename}</h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 text-xs font-medium border rounded-full ${getCategoryColor(document.category)}`}>
                  {document.category.replace('_', ' ')}
                </span>
                {!document.verified && (
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    File not found
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {document.description && (
            <p className="text-sm text-gray-600 mb-2">{document.description}</p>
          )}

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {document.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full flex items-center"
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center">
              <User className="w-3 h-3 mr-1" />
              {document.added_by}
            </span>
            <span className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(document.added_at).toLocaleDateString()}
            </span>
            {document.size_bytes && (
              <span>{formatFileSize(document.size_bytes)}</span>
            )}
          </div>

          {/* Full Path (when expanded) */}
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 break-all"
            >
              {document.absolute_path}
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Show details"
          >
            <Folder className="w-4 h-4" />
          </button>
          
          <button
            onClick={onOpen}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            title="Open document"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {onRemove && (
            <button
              onClick={onRemove}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
              title="Remove document"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Add Document Dialog Component
interface AddDocumentDialogProps {
  onClose: () => void
  onAdd: (document: Omit<DocumentReference, 'added_at' | 'added_by' | 'verified'>) => void
}

function AddDocumentDialog({ onClose, onAdd }: AddDocumentDialogProps) {
  const [formData, setFormData] = useState({
    path: '',
    description: '',
    category: 'other' as DocumentCategory,
    tags: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const pathParts = formData.path.split('/')
    const filename = pathParts[pathParts.length - 1]
    const fileExtension = filename.split('.').pop() || ''

    const document: Omit<DocumentReference, 'added_at' | 'added_by' | 'verified'> = {
      path: formData.path,
      absolute_path: formData.path.startsWith('/') ? formData.path : `${process.cwd()}/${formData.path}`,
      filename,
      file_type: fileExtension,
      description: formData.description || undefined,
      category: formData.category,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : undefined,
    }

    onAdd(document)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Supporting Document</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Path or URL
            </label>
            <input
              type="text"
              required
              value={formData.path}
              onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
              placeholder="/path/to/document.pdf or https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as DocumentCategory }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="requirement">📋 Requirement</option>
              <option value="design">🎨 Design</option>
              <option value="specification">📝 Specification</option>
              <option value="test_plan">🧪 Test Plan</option>
              <option value="meeting_notes">📅 Meeting Notes</option>
              <option value="decision_record">⚖️ Decision Record</option>
              <option value="architecture">🏗️ Architecture</option>
              <option value="user_story">👤 User Story</option>
              <option value="acceptance_criteria">✅ Acceptance Criteria</option>
              <option value="research">🔍 Research</option>
              <option value="reference">📚 Reference</option>
              <option value="other">📄 Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the document..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (Optional)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="tag1, tag2, tag3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Document
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}