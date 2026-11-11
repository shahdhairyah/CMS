import { useState, useEffect, useMemo } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  BookOpen, SearchIcon, CalendarIcon, WarningIcon, CheckIcon,
  LibraryIcon, FeeIcon, RefreshIcon, PlusIcon, EditIcon, TrashIcon,
  UsersIcon, LoaderIcon, FilterIcon, ArrowRight
} from '../../utils/icons';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { libraryAPI, studentAPI } from '../../services/api';

export default function AdminLibrary() {
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('circulation'); // 'circulation' | 'catalog'
  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Catalog search / filter
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Circulation filter
  const [circSearch, setCircSearch] = useState('');
  const [circStatus, setCircStatus] = useState('all');

  // Add Book Modal state
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [bookForm, setBookForm] = useState({
    title: '', author: '', isbn: '', publisher: '', category: '', total_copies: 1
  });

  // Issue Book Modal state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    book_id: '',
    duration_days: 14,
    student_query: '',
    selected_student: null,
  });

  // Live Student Search Suggestion state
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  useEffect(() => {
    loadLibraryData();
  }, []);

  // Debounced search for student auto-suggest
  useEffect(() => {
    const query = issueForm.student_query.trim();
    if (!query || issueForm.selected_student) {
      setStudentSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingStudents(true);
      try {
        const res = await studentAPI.getAll({ search: query, page_size: 6 });
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.students || []);
          setStudentSearchResults(list);
        }
      } catch (err) {
        // silent fail
      } finally {
        setIsSearchingStudents(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [issueForm.student_query, issueForm.selected_student]);

  const loadLibraryData = async () => {
    try {
      setLoading(true);
      setError('');

      const [statsRes, booksRes, issuesRes, catsRes] = await Promise.allSettled([
        libraryAPI.getStatistics(),
        libraryAPI.getBooks({ page_size: 150 }),
        libraryAPI.getAllIssues({ page_size: 150 }),
        libraryAPI.getCategories(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
        setStats(statsRes.value.data);
      }
      if (booksRes.status === 'fulfilled' && booksRes.value?.success) {
        const data = booksRes.value.data;
        setBooks(Array.isArray(data) ? data : (data.books || []));
      }
      if (issuesRes.status === 'fulfilled' && issuesRes.value?.success) {
        const data = issuesRes.value.data;
        setIssues(Array.isArray(data) ? data : (data.issues || []));
      }
      if (catsRes.status === 'fulfilled' && catsRes.value?.success) {
        setCategories(catsRes.value.data || []);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load library data');
    } finally {
      setLoading(false);
    }
  };

  // Add Book
  const handleAddBook = async (e) => {
    e.preventDefault();
    if (!bookForm.title || !bookForm.author) {
      setError('Title and Author are required fields.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      const res = await libraryAPI.addBook(bookForm);
      if (res.success) {
        setSuccessMsg('Book registered into library catalogue successfully!');
        setShowAddBookModal(false);
        setBookForm({ title: '', author: '', isbn: '', publisher: '', category: '', total_copies: 1 });
        await loadLibraryData();
      } else {
        setError(res.message || 'Failed to add book');
      }
    } catch (err) {
      setError(err.message || 'Error adding book to catalogue');
    } finally {
      setActionLoading(false);
    }
  };

  // Issue Book (supports Student Name, Email, or Roll Number)
  const handleIssueBook = async (e) => {
    e.preventDefault();
    if (!issueForm.book_id) {
      setError('Please select a book to issue.');
      return;
    }
    const studentIdentifier = issueForm.selected_student
      ? issueForm.selected_student.id
      : issueForm.student_query.trim();

    if (!studentIdentifier) {
      setError('Please provide student Name, Email, or Roll Number.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const payload = {
        book_id: issueForm.book_id,
        student_id: issueForm.selected_student ? issueForm.selected_student.id : null,
        student_identifier: studentIdentifier,
        duration_days: issueForm.duration_days || 14
      };

      const res = await libraryAPI.issueBook(payload);
      if (res.success) {
        setSuccessMsg(res.message || 'Book issued successfully!');
        setShowIssueModal(false);
        setIssueForm({ book_id: '', duration_days: 14, student_query: '', selected_student: null });
        await loadLibraryData();
      } else {
        setError(res.message || 'Failed to issue book');
      }
    } catch (err) {
      setError(err.message || 'Error issuing book. Please verify student details.');
    } finally {
      setActionLoading(false);
    }
  };

  // Return Book
  const handleReturnBook = async (issueId) => {
    if (!window.confirm('Confirm receiving this returned book into inventory?')) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await libraryAPI.returnBook({ issue_id: issueId });
      if (res.success) {
        setSuccessMsg(res.message || 'Book returned successfully!');
        await loadLibraryData();
      } else {
        setError(res.message || 'Failed to return book');
      }
    } catch (err) {
      setError(err.message || 'Error processing return');
    } finally {
      setActionLoading(false);
    }
  };

  // Pay Fine
  const handlePayFine = async (issueId) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await libraryAPI.payFine({ issue_id: issueId });
      if (res.success) {
        setSuccessMsg('Fine marked as paid and cleared!');
        await loadLibraryData();
      } else {
        setError(res.message || 'Failed to record fine payment');
      }
    } catch (err) {
      setError(err.message || 'Error recording payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered books
  const filteredBooks = useMemo(() => {
    let list = books;
    if (categoryFilter !== 'all') {
      list = list.filter((b) => b.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        [b.title, b.author, b.isbn, b.publisher, b.category]
          .some((f) => (f || '').toLowerCase().includes(q))
      );
    }
    return list;
  }, [books, categoryFilter, search]);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    let list = issues;
    if (circStatus !== 'all') {
      if (circStatus === 'overdue') {
        list = list.filter((i) => i.status === 'issued' && Number(i.days_overdue) > 0);
      } else {
        list = list.filter((i) => i.status === circStatus);
      }
    }
    if (circSearch.trim()) {
      const q = circSearch.toLowerCase();
      list = list.filter((i) =>
        [i.book_title, i.book_author, i.first_name, i.last_name, i.roll_number]
          .some((f) => (f || '').toLowerCase().includes(q))
      );
    }
    return list;
  }, [issues, circStatus, circSearch]);

  if (loading) return <LoadingSpinner size="lg" text="Loading Library Circulation Desk..." />;

  const overdueCount = issues.filter((i) => i.status === 'issued' && Number(i.days_overdue) > 0).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Library Desk & Circulation Hub"
          subtitle="Real-time catalogue inventory, student book checkout/returns, and fine management"
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowAddBookModal(true)}
            className="btn btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
          >
            <PlusIcon size={14} />
            <span>Add Book</span>
          </button>
          <button
            onClick={() => {
              setIssueForm({ book_id: '', duration_days: 14, student_query: '', selected_student: null });
              setShowIssueModal(true);
            }}
            className="btn btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 shadow-md"
          >
            <LibraryIcon size={14} />
            <span>Issue Book</span>
          </button>
          <button
            onClick={loadLibraryData}
            className="btn btn-secondary text-xs p-2"
            title="Refresh records"
          >
            <RefreshIcon size={14} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-muted hover:text-white">&times;</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckIcon size={16} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-muted hover:text-white">&times;</button>
        </div>
      )}

      {/* Summary KPI Strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-4">
            <span className="text-[11px] text-muted uppercase font-semibold">Catalogue Titles</span>
            <p className="text-xl font-bold text-white mt-1">{stats.total_titles || 0}</p>
            <span className="text-[10px] text-muted">{stats.total_inventory || 0} total copies</span>
          </div>
          <div className="card p-4">
            <span className="text-[11px] text-muted uppercase font-semibold">Active Loans</span>
            <p className="text-xl font-bold text-accent-light mt-1">{stats.active_loans || 0}</p>
            <span className="text-[10px] text-muted">{stats.available_books || 0} on shelf</span>
          </div>
          <div className="card p-4">
            <span className="text-[11px] text-muted uppercase font-semibold">Overdue Returns</span>
            <p className={`text-xl font-bold mt-1 ${overdueCount > 0 ? 'text-danger' : 'text-success'}`}>
              {overdueCount}
            </p>
            <span className="text-[10px] text-muted">Late student loans</span>
          </div>
          <div className="card p-4">
            <span className="text-[11px] text-muted uppercase font-semibold">Uncollected Fines</span>
            <p className="text-xl font-bold text-warning font-mono mt-1">
              {formatCurrency(stats.pending_fines || 0)}
            </p>
            <span className="text-[10px] text-muted">Accruing ₹5/day</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-surface-border gap-2">
        <button
          onClick={() => setActiveTab('circulation')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'circulation'
              ? 'border-accent text-accent-light'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          <LibraryIcon size={15} />
          <span>Circulation & Lending ({issues.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'border-accent text-accent-light'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          <BookOpen size={15} />
          <span>Book Inventory ({books.length})</span>
        </button>
      </div>

      {/* ----------------- TAB 1: CIRCULATION ----------------- */}
      {activeTab === 'circulation' && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search by student Name, Roll number, or Book title..."
                  value={circSearch}
                  onChange={(e) => setCircSearch(e.target.value)}
                  className="input pl-10 text-xs w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Status:</span>
                <select
                  value={circStatus}
                  onChange={(e) => setCircStatus(e.target.value)}
                  className="input py-1.5 px-3 text-xs min-w-[130px]"
                >
                  <option value="all">All Records</option>
                  <option value="issued">Active Loans</option>
                  <option value="overdue">Overdue Only</option>
                  <option value="returned">Returned</option>
                  <option value="fine_paid">Fine Settled</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            {filteredIssues.length === 0 ? (
              <EmptyState
                icon={LibraryIcon}
                title="No Circulation Records"
                description="No lending records found matching your filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4">Student</th>
                      <th className="text-left py-3 pr-4">Book Title</th>
                      <th className="text-left py-3 pr-4">Issue Date</th>
                      <th className="text-left py-3 pr-4">Due Date</th>
                      <th className="text-right py-3 pr-4">Fine Amount</th>
                      <th className="text-center py-3 pr-4">Status</th>
                      <th className="text-right py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/50">
                    {filteredIssues.map((loan) => {
                      const isOverdue = loan.status === 'issued' && Number(loan.days_overdue) > 0;
                      const fine = Number(loan.effective_fine || 0);
                      return (
                        <tr key={loan.id} className="hover:bg-surface-hover/30 transition-colors">
                          <td className="py-3.5 pr-4">
                            <p className="text-white font-medium text-xs">
                              {loan.first_name} {loan.last_name}
                            </p>
                            <span className="badge badge-accent text-[10px] font-mono mt-0.5">
                              {loan.roll_number}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <p className="text-white text-xs font-medium max-w-[220px] truncate">
                              {loan.book_title}
                            </p>
                            <span className="text-[11px] text-muted">{loan.book_author}</span>
                          </td>
                          <td className="py-3.5 pr-4 text-xs text-muted">
                            {formatDate(loan.issue_date)}
                          </td>
                          <td className="py-3.5 pr-4 text-xs">
                            <span className={isOverdue ? 'text-danger font-semibold' : 'text-muted-light'}>
                              {formatDate(loan.due_date)}
                            </span>
                            {isOverdue && (
                              <span className="block text-[10px] text-danger font-mono">
                                ({loan.days_overdue}d overdue)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 pr-4 text-right font-mono text-xs">
                            {fine > 0 ? (
                              <span className="text-danger font-semibold">{formatCurrency(fine)}</span>
                            ) : (
                              <span className="text-muted">₹0.00</span>
                            )}
                          </td>
                          <td className="py-3.5 pr-4 text-center">
                            {isOverdue ? (
                              <span className="badge badge-danger text-xs inline-flex items-center gap-1">
                                <WarningIcon size={11} /> Overdue
                              </span>
                            ) : loan.status === 'issued' ? (
                              <span className="badge badge-success text-xs inline-flex items-center gap-1">
                                <CheckIcon size={11} /> Active
                              </span>
                            ) : loan.status === 'fine_paid' ? (
                              <span className="badge badge-accent text-xs">Fine Paid</span>
                            ) : (
                              <span className="badge badge-muted text-xs">Returned</span>
                            )}
                          </td>
                          <td className="py-3.5 text-right">
                            {loan.status === 'issued' ? (
                              <button
                                onClick={() => handleReturnBook(loan.id)}
                                disabled={actionLoading}
                                className="btn btn-primary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                              >
                                <CheckIcon size={12} />
                                <span>Receive Return</span>
                              </button>
                            ) : loan.status === 'returned' && fine > 0 ? (
                              <button
                                onClick={() => handlePayFine(loan.id)}
                                disabled={actionLoading}
                                className="btn btn-secondary text-xs py-1 px-2.5 text-warning hover:border-warning"
                              >
                                <span>Collect ₹{fine}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-muted">Closed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: CATALOG ----------------- */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search catalog by title, author, ISBN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10 text-xs w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input py-1.5 px-3 text-xs min-w-[140px]"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            {filteredBooks.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No Books in Catalogue"
                description="Click 'Add Book' above to register new titles."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4">Book Details</th>
                      <th className="text-left py-3 pr-4">ISBN</th>
                      <th className="text-left py-3 pr-4">Category</th>
                      <th className="text-center py-3 pr-4">Total</th>
                      <th className="text-center py-3 pr-4">Available</th>
                      <th className="text-center py-3 pr-4">Status</th>
                      <th className="text-right py-3">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/50">
                    {filteredBooks.map((book) => {
                      const avail = Number(book.available_copies);
                      return (
                        <tr key={book.id} className="hover:bg-surface-hover/30 transition-colors">
                          <td className="py-3.5 pr-4">
                            <p className="text-white font-medium text-xs sm:text-sm">{book.title}</p>
                            <p className="text-xs text-muted">by {book.author}</p>
                          </td>
                          <td className="py-3.5 pr-4 font-mono text-xs text-muted-light">
                            {book.isbn || '-'}
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="badge badge-accent text-[10px] uppercase">
                              {book.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-center font-mono text-xs text-white">
                            {book.total_copies}
                          </td>
                          <td className="py-3.5 pr-4 text-center font-mono text-xs">
                            <span className={avail > 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                              {avail}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-center">
                            {avail > 0 ? (
                              <span className="badge badge-success text-[10px]">In Stock</span>
                            ) : (
                              <span className="badge badge-danger text-[10px]">Out of Stock</span>
                            )}
                          </td>
                          <td className="py-3.5 text-right">
                            {avail > 0 ? (
                              <button
                                onClick={() => {
                                  setIssueForm({
                                    book_id: book.id,
                                    duration_days: 14,
                                    student_query: '',
                                    selected_student: null,
                                  });
                                  setShowIssueModal(true);
                                }}
                                className="btn btn-secondary text-xs py-1 px-2 text-accent-light hover:border-accent"
                              >
                                Issue
                              </button>
                            ) : (
                              <span className="text-xs text-muted">All Issued</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- MODAL: ADD BOOK ----------------- */}
      {showAddBookModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-raised border border-surface-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Add New Book to Catalog</h3>
              <button onClick={() => setShowAddBookModal(false)} className="text-muted hover:text-white">&times;</button>
            </div>
            <form onSubmit={handleAddBook} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Introduction to Algorithms"
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  className="input text-xs w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Author *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Thomas H. Cormen"
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  className="input text-xs w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted block mb-1">ISBN</label>
                  <input
                    type="text"
                    placeholder="978-0262033848"
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    className="input text-xs w-full font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Total Copies</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bookForm.total_copies}
                    onChange={(e) => setBookForm({ ...bookForm, total_copies: e.target.value })}
                    className="input text-xs w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted block mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="Computer Engineering"
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    className="input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Publisher</label>
                  <input
                    type="text"
                    placeholder="MIT Press"
                    value={bookForm.publisher}
                    onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                    className="input text-xs w-full"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBookModal(false)}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                >
                  {actionLoading ? <LoaderIcon size={14} className="animate-spin" /> : <PlusIcon size={14} />}
                  <span>Save to Catalogue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: ISSUE BOOK (Name / Email / Roll Number) ----------------- */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-raised border border-surface-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Issue Book to Student</h3>
                <p className="text-xs text-muted mt-0.5">Find student by Name, Email, or Roll number</p>
              </div>
              <button
                onClick={() => {
                  setShowIssueModal(false);
                  setStudentSearchResults([]);
                }}
                className="text-muted hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleIssueBook} className="space-y-4">
              {/* Book Select */}
              <div>
                <label className="text-xs text-muted block mb-1">Select Book *</label>
                <select
                  required
                  value={issueForm.book_id}
                  onChange={(e) => setIssueForm({ ...issueForm, book_id: e.target.value })}
                  className="input text-xs w-full"
                >
                  <option value="">-- Choose Book from Catalogue --</option>
                  {books.filter((b) => Number(b.available_copies) > 0).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.available_copies} available)
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Identification by Name / Email / Roll Number */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted block">
                    Student (Name / Email / Roll Number) *
                  </label>
                  {issueForm.selected_student && (
                    <button
                      type="button"
                      onClick={() =>
                        setIssueForm((prev) => ({
                          ...prev,
                          selected_student: null,
                          student_query: '',
                        }))
                      }
                      className="text-[11px] text-accent-light hover:underline"
                    >
                      Change Student
                    </button>
                  )}
                </div>

                {issueForm.selected_student ? (
                  /* Confirmed Selected Student Badge */
                  <div className="p-3 rounded-lg bg-surface-overlay border border-accent/40 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white">
                        {issueForm.selected_student.first_name} {issueForm.selected_student.last_name}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        Roll: <span className="text-accent-light font-mono font-medium">{issueForm.selected_student.roll_number}</span>
                        {issueForm.selected_student.email ? ` · ${issueForm.selected_student.email}` : ''}
                      </p>
                    </div>
                    <span className="badge badge-success text-[10px] shrink-0 inline-flex items-center gap-1">
                      <CheckIcon size={10} /> Verified
                    </span>
                  </div>
                ) : (
                  /* Search Input Field */
                  <>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Search student Name, Email, or Roll No..."
                        value={issueForm.student_query}
                        onChange={(e) =>
                          setIssueForm({
                            ...issueForm,
                            student_query: e.target.value,
                            selected_student: null,
                          })
                        }
                        className="input text-xs w-full pr-8"
                      />
                      {isSearchingStudents && (
                        <LoaderIcon size={14} className="animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
                      )}
                    </div>

                    {/* Auto-suggest dropdown */}
                    {studentSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-surface-overlay border border-surface-border rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-surface-border/50">
                        {studentSearchResults.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setIssueForm((prev) => ({
                                ...prev,
                                selected_student: s,
                                student_query: `${s.first_name} ${s.last_name} (${s.roll_number})`,
                              }));
                              setStudentSearchResults([]);
                            }}
                            className="w-full text-left p-2.5 hover:bg-surface-hover/70 transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate">
                                {s.first_name} {s.last_name}
                              </p>
                              <p className="text-[11px] text-muted truncate">
                                {s.email || 'No email'} · {s.department_name || ''}
                              </p>
                            </div>
                            <span className="badge badge-accent text-[10px] font-mono ml-2 shrink-0">
                              {s.roll_number}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Loan Duration */}
              <div>
                <label className="text-xs text-muted block mb-1">Lending Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={issueForm.duration_days}
                  onChange={(e) => setIssueForm({ ...issueForm, duration_days: e.target.value })}
                  className="input text-xs w-full"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowIssueModal(false);
                    setStudentSearchResults([]);
                  }}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                >
                  {actionLoading ? <LoaderIcon size={14} className="animate-spin" /> : <LibraryIcon size={14} />}
                  <span>Issue Book</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
