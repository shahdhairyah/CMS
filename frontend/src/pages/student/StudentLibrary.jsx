import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  BookOpen, SearchIcon, CalendarIcon, WarningIcon, CheckIcon,
  LibraryIcon, FeeIcon, RefreshIcon, ArrowRight
} from '../../utils/icons';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { libraryAPI } from '../../services/api';

export default function StudentLibrary() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeLoans, setActiveLoans] = useState([]);
  const [recentLoans, setRecentLoans] = useState([]);
  const [finesList, setFinesList] = useState([]);
  const [totalFines, setTotalFines] = useState(0);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'my_loans' | 'history'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [booksRes, loansRes, catsRes] = await Promise.allSettled([
        libraryAPI.getBooks({ page_size: 100 }),
        libraryAPI.getMyLoans(),
        libraryAPI.getCategories(),
      ]);

      if (booksRes.status === 'fulfilled' && booksRes.value?.success) {
        const data = booksRes.value.data;
        setBooks(Array.isArray(data) ? data : (data.books || []));
      } else {
        setError('Could not load the library catalogue.');
      }

      if (loansRes.status === 'fulfilled' && loansRes.value?.success) {
        const data = loansRes.value.data || {};
        setActiveLoans(data.active || []);
        setRecentLoans(data.recent || []);
        setFinesList(data.fines || []);
        setTotalFines(Number(data.total_fines || 0));
      }

      if (catsRes.status === 'fulfilled' && catsRes.value?.success) {
        setCategories(catsRes.value.data || []);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load library details');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = useMemo(() => {
    let list = books;
    if (selectedCategory !== 'all') {
      list = list.filter((b) => b.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        [b.title, b.author, b.isbn, b.publisher, b.category]
          .some((f) => (f || '').toLowerCase().includes(q))
      );
    }
    return list;
  }, [books, selectedCategory, search]);

  const heldBookIds = useMemo(
    () => new Set(activeLoans.map((loan) => Number(loan.book_id))),
    [activeLoans]
  );

  const overdueLoans = activeLoans.filter((loan) => Number(loan.is_overdue) === 1);

  if (loading) return <LoadingSpinner size="lg" text="Loading ADIT Central Library..." />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Central Library & Knowledge Hub"
          subtitle={`Explore digital catalog, track your issued books and monitor library fines · ${user?.profile?.roll_number || ''}`}
        />
        <button
          onClick={loadData}
          className="btn btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshIcon size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="text-xs font-semibold underline ml-3">Retry</button>
        </div>
      )}

      {/* Overdue Warning Alert Banner */}
      {overdueLoans.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <div className="flex items-start gap-3">
            <WarningIcon size={20} className="text-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-danger">
                {overdueLoans.length} Overdue Book{overdueLoans.length > 1 ? 's' : ''} Require Immediate Return
              </h4>
              <p className="text-xs text-muted mt-0.5">
                Daily late fine of ₹5/day is actively calculated. Please return the following titles to the library circulation desk:
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {overdueLoans.map((l) => (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-raised border border-danger/25 text-xs text-white"
                  >
                    <span className="font-medium truncate max-w-[200px]">{l.title}</span>
                    <span className="text-danger font-mono font-semibold">({l.days_overdue}d late)</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen size={22} />}
          label="Catalogued Books"
          value={books.length}
          color="primary"
          subtext="Available Titles"
        />
        <StatCard
          icon={<LibraryIcon size={22} />}
          label="Active Loans"
          value={activeLoans.length}
          color="accent"
          subtext="Books in your possession"
        />
        <StatCard
          icon={<WarningIcon size={22} />}
          label="Overdue Books"
          value={overdueLoans.length}
          color={overdueLoans.length > 0 ? 'danger' : 'success'}
          subtext={overdueLoans.length > 0 ? 'Requires immediate return' : 'All loans on time'}
        />
        <StatCard
          icon={<FeeIcon size={22} />}
          label="Outstanding Fine"
          value={formatCurrency(totalFines)}
          color={totalFines > 0 ? 'warning' : 'success'}
          subtext={totalFines > 0 ? 'Payable at circulation desk' : 'Zero dues'}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-surface-border gap-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'border-accent text-accent-light'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          <BookOpen size={15} />
          <span>Browse Catalog ({filteredBooks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('my_loans')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'my_loans'
              ? 'border-accent text-accent-light'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          <LibraryIcon size={15} />
          <span>My Active Loans</span>
          {activeLoans.length > 0 && (
            <span className="badge badge-accent text-[10px] px-1.5 py-0.2">
              {activeLoans.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-accent text-accent-light'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          <CalendarIcon size={15} />
          <span>Borrowing History</span>
        </button>
      </div>

      {/* ----------------- TAB 1: BROWSE CATALOG ----------------- */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="card p-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search books by title, author, ISBN or publisher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10 text-xs w-full"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <span className="text-xs text-muted whitespace-nowrap">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input py-1.5 px-3 text-xs min-w-[150px]"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category} ({c.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Book Cards Grid */}
          {filteredBooks.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No Books Found"
              description="No titles match your query. Try searching with different keywords."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBooks.map((book) => {
                const isHeldByMe = heldBookIds.has(Number(book.id));
                const available = Number(book.available_copies) > 0;
                return (
                  <div
                    key={book.id}
                    className="card p-4 flex flex-col justify-between hover:border-surface-hover transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="badge badge-accent text-[10px] uppercase">
                          {book.category || 'General'}
                        </span>
                        {isHeldByMe ? (
                          <span className="badge badge-warning text-[10px] inline-flex items-center gap-1">
                            <CheckIcon size={10} /> Currently on loan
                          </span>
                        ) : available ? (
                          <span className="badge badge-success text-[10px]">
                            {book.available_copies} available
                          </span>
                        ) : (
                          <span className="badge badge-danger text-[10px]">
                            Out of stock
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
                        {book.title}
                      </h4>
                      <p className="text-xs text-muted mt-1">by {book.author || 'Unknown Author'}</p>
                      {book.publisher && (
                        <p className="text-[11px] text-muted-dark mt-0.5">Publisher: {book.publisher}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-surface-border/50 flex items-center justify-between text-xs text-muted">
                      <span className="font-mono text-[11px]">
                        {book.isbn ? `ISBN: ${book.isbn}` : 'Ref: #' + book.id}
                      </span>
                      <span className="text-[11px]">
                        Total Copies: <strong className="text-white">{book.total_copies}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 2: ACTIVE LOANS ----------------- */}
      {activeTab === 'my_loans' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Currently Issued Books</h3>
              <p className="text-xs text-muted mt-0.5">Books issued to your student account from ADIT central library</p>
            </div>
            <span className="badge badge-accent text-xs">{activeLoans.length} Active</span>
          </div>

          {activeLoans.length === 0 ? (
            <EmptyState
              icon={LibraryIcon}
              title="No Active Book Loans"
              description="You have no books currently checked out. Visit the library circulation desk to borrow books."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                    <th className="text-left py-3 pr-4">Book Details</th>
                    <th className="text-left py-3 pr-4">Issue Date</th>
                    <th className="text-left py-3 pr-4">Due Date</th>
                    <th className="text-right py-3 pr-4">Accrued Fine</th>
                    <th className="text-center py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  {activeLoans.map((loan) => {
                    const isLate = Number(loan.is_overdue) === 1;
                    const fineAmt = Number(loan.computed_fine || 0);
                    return (
                      <tr key={loan.id} className="hover:bg-surface-hover/30 transition-colors">
                        <td className="py-3.5 pr-4">
                          <p className="text-white font-medium text-xs sm:text-sm">{loan.title}</p>
                          <p className="text-xs text-muted">by {loan.author} {loan.isbn ? `· ISBN: ${loan.isbn}` : ''}</p>
                        </td>
                        <td className="py-3.5 pr-4 text-muted text-xs">
                          {formatDate(loan.issue_date)}
                        </td>
                        <td className="py-3.5 pr-4 text-xs">
                          <span className={isLate ? 'text-danger font-semibold' : 'text-white'}>
                            {formatDate(loan.due_date)}
                          </span>
                          {isLate && (
                            <span className="block text-[11px] text-danger font-mono">
                              ({loan.days_overdue} days overdue)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4 text-right font-mono font-semibold text-xs">
                          {fineAmt > 0 ? (
                            <span className="text-danger">{formatCurrency(fineAmt)}</span>
                          ) : (
                            <span className="text-success">₹ 0.00</span>
                          )}
                        </td>
                        <td className="py-3.5 text-center">
                          {isLate ? (
                            <span className="badge badge-danger text-xs inline-flex items-center gap-1">
                              <WarningIcon size={12} /> Overdue
                            </span>
                          ) : (
                            <span className="badge badge-success text-xs inline-flex items-center gap-1">
                              <CheckIcon size={12} /> Active Loan
                            </span>
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
      )}

      {/* ----------------- TAB 3: BORROWING HISTORY ----------------- */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Historical Circulation Ledger</h3>
              <p className="text-xs text-muted mt-0.5">Records of previously borrowed and returned books</p>
            </div>
            <span className="text-xs text-muted-light font-mono">{recentLoans.length} Records</span>
          </div>

          {recentLoans.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="No Past Borrowing History"
              description="Your completed loans and fine receipts will be archived here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                    <th className="text-left py-3 pr-4">Book Title</th>
                    <th className="text-left py-3 pr-4">Issue Date</th>
                    <th className="text-left py-3 pr-4">Return Date</th>
                    <th className="text-right py-3 pr-4">Paid / Settled Fine</th>
                    <th className="text-center py-3">Closure Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  {recentLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="py-3.5 pr-4">
                        <p className="text-white font-medium text-xs sm:text-sm">{loan.title}</p>
                        <p className="text-xs text-muted">by {loan.author}</p>
                      </td>
                      <td className="py-3.5 pr-4 text-muted text-xs">
                        {formatDate(loan.issue_date)}
                      </td>
                      <td className="py-3.5 pr-4 text-muted text-xs">
                        {loan.return_date ? formatDate(loan.return_date) : '-'}
                      </td>
                      <td className="py-3.5 pr-4 text-right text-xs font-mono font-medium">
                        {Number(loan.fine_amount) > 0 ? (
                          <span className="text-warning">{formatCurrency(loan.fine_amount)}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="py-3.5 text-center">
                        <span
                          className={`badge text-xs ${
                            loan.status === 'fine_paid'
                              ? 'badge-success'
                              : loan.status === 'returned'
                              ? 'badge-accent'
                              : 'badge-muted'
                          }`}
                        >
                          {loan.status === 'fine_paid' ? 'Returned · Fine Settled' : 'Returned'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
