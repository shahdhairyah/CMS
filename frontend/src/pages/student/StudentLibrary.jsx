import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  BookOpen, SearchIcon, CalendarIcon, WarningIcon, CheckIcon, LibraryIcon, FeeIcon,
} from '../../utils/icons';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { libraryAPI } from '../../services/api';

/**
 * A student's view of the library.
 *
 * Everything here comes from /library/my-loans, which identifies the student
 * from the token rather than from a route or query parameter. An earlier
 * version asked for ?id and trusted it, so any logged-in account could read
 * another student's borrowing record by changing the number.
 */
export default function StudentLibrary() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [active, setActive] = useState([]);
  const [fines, setFines] = useState([]);
  const [totalFines, setTotalFines] = useState(0);
  const [recent, setRecent] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      // The catalogue and the loans are independent; a failure on one should
      // not blank out the other.
      const [booksRes, loansRes] = await Promise.allSettled([
        libraryAPI.getBooks(),
        libraryAPI.getMyLoans(),
      ]);

      if (booksRes.status === 'fulfilled' && booksRes.value?.success) {
        setBooks(booksRes.value.data || []);
      } else {
        setError('Could not load the catalogue.');
      }

      if (loansRes.status === 'fulfilled' && loansRes.value?.success) {
        const data = loansRes.value.data || {};
        setActive(data.active || []);
        setFines(data.fines || []);
        setTotalFines(Number(data.total_fines || 0));
        setRecent(data.recent || []);
      } else {
        setError((prev) => prev || 'Could not load your library records.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to load library data');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = useMemo(() => {
    if (!search) return books;
    const q = search.toLowerCase();
    return books.filter((book) =>
      [book.title, book.author, book.isbn, book.category]
        .some((field) => (field || '').toLowerCase().includes(q))
    );
  }, [books, search]);

  // Loans the student has already taken out, so the catalogue can say
  // "you have this" instead of offering the same copy twice.
  const heldTitles = useMemo(
    () => new Set(active.map((loan) => Number(loan.book_id))),
    [active]
  );

  // days_overdue is DATEDIFF(today, due_date), so it is negative while a loan
  // is still within its period and positive once it is late.
  const overdue = active.filter((loan) => Number(loan.is_overdue) === 1);

  if (loading) return <LoadingSpinner size="lg" text="Loading library..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Library"
        subtitle={`Browse the catalogue and track the books on your loan${user?.profile?.roll_number ? ` · ${user.profile.roll_number}` : ''}.`}
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-4">
          <span>{error}</span>
          <button onClick={loadData} className="text-xs font-medium shrink-0">Retry</button>
        </div>
      )}

      {(overdue.length > 0 || totalFines > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {overdue.length > 0 && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <WarningIcon size={20} className="text-danger shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-danger">
                    {overdue.length} book{overdue.length > 1 ? 's are' : ' is'} overdue
                  </p>
                  <p className="text-xs text-muted mt-1">
                    A fine accrues each day after the due date. Please return {overdue.length > 1 ? 'them' : 'it'} to the library desk.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {overdue.map((loan) => (
                      <li key={loan.id} className="text-xs text-muted-light">
                        {loan.book_title} · {Math.abs(Number(loan.days_overdue))} day(s) late
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {totalFines > 0 && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FeeIcon size={20} className="text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-warning">
                    {formatCurrency(totalFines)} in library fines
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Settle it at the library desk. A fine is charged per day after the due date.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- my loans */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <LibraryIcon size={18} className="text-accent-light" /> Books On Loan
          </h3>
          <span className="text-xs text-muted">{active.length} issued</span>
        </div>

        {active.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={32} />}
            title="No Books Issued"
            description="You are not currently holding any books. Ask at the library desk to borrow one."
          />
        ) : (
          <div className="space-y-3">
            {active.map((loan) => {
              const late = Number(loan.is_overdue) === 1;
              const days = Math.abs(Number(loan.days_overdue));
              return (
                <div
                  key={loan.id}
                  className={`p-4 bg-surface-overlay rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    late ? 'border-danger/30' : 'border-surface-border/50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      late ? 'bg-danger/10' : 'bg-accent/10'
                    }`}>
                      <BookOpen size={18} className={late ? 'text-danger' : 'text-accent-light'} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-light truncate">{loan.book_title}</p>
                      <p className="text-xs text-muted truncate">{loan.book_author}</p>
                      <p className="text-xs text-muted mt-1 flex items-center gap-1.5">
                        <CalendarIcon size={12} />
                        Issued {formatDate(loan.issue_date)} · Due {formatDate(loan.due_date)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                    late
                      ? 'bg-danger/10 text-danger'
                      : days <= 2
                        ? 'bg-warning/10 text-warning'
                        : 'bg-success/10 text-success'
                  }`}>
                    {late ? `${days} day(s) overdue` : days === 0 ? 'Due today' : `${days} day(s) left`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------- fines */}
      {fines.length > 0 && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-1">Unsettled Fines</h3>
          <p className="text-xs text-muted mb-5">Pay at the library desk to clear these.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Book</th>
                  <th className="text-left py-3 pr-4">Returned</th>
                  <th className="text-center py-3 pr-4">Days Late</th>
                  <th className="text-right py-3">Fine</th>
                </tr>
              </thead>
              <tbody>
                {fines.map((fine) => (
                  <tr key={fine.id} className="border-b border-surface-border/50 last:border-0">
                    <td className="py-3.5 pr-4 text-muted-light">{fine.book_title}</td>
                    <td className="py-3.5 pr-4 text-muted">{formatDate(fine.return_date)}</td>
                    <td className="py-3.5 pr-4 text-center text-muted">{fine.days_overdue || 0}</td>
                    <td className="py-3.5 text-right text-danger font-medium">
                      {formatCurrency(fine.fine_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- catalogue */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h3 className="text-base font-semibold text-white">Catalogue</h3>
          <div className="relative max-w-xs w-full">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dark" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, author, ISBN..."
              className="w-full bg-surface-overlay border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>

        {filteredBooks.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={32} />}
            title="No Books Found"
            description={search ? 'Try a different search term.' : 'No books are available in the library.'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((book) => {
              const available = Number(book.available_copies) > 0;
              const held = heldTitles.has(Number(book.id));
              return (
                <div
                  key={book.id}
                  className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors flex flex-col"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={18} className="text-accent-light" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-muted-light truncate">{book.title}</p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        {book.author || 'Unknown author'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-dark truncate">
                      {book.isbn ? `ISBN ${book.isbn}` : book.category || ''}
                    </span>
                    {held ? (
                      <span className="px-2 py-0.5 rounded bg-warning/10 text-warning font-medium flex items-center gap-1 shrink-0">
                        <CheckIcon size={11} /> On loan
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded font-medium shrink-0 ${
                        available ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}>
                        {available ? `${book.available_copies} available` : 'Unavailable'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------ history */}
      {recent.length > 0 && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-5">Borrowing History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Book</th>
                  <th className="text-left py-3 pr-4">Issued</th>
                  <th className="text-left py-3 pr-4">Returned</th>
                  <th className="text-right py-3 pr-4">Fine</th>
                  <th className="text-center py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((loan) => {
                  const late = Number(loan.is_overdue) === 1;
                  const settled = loan.status === 'fine_paid' || loan.status === 'returned';
                  return (
                    <tr key={loan.id} className="border-b border-surface-border/50 last:border-0">
                      <td className="py-3.5 pr-4">
                        <p className="text-muted-light">{loan.book_title}</p>
                        <p className="text-xs text-muted">{loan.book_author}</p>
                      </td>
                      <td className="py-3.5 pr-4 text-muted">{formatDate(loan.issue_date)}</td>
                      <td className="py-3.5 pr-4 text-muted">
                        {loan.return_date ? formatDate(loan.return_date) : '-'}
                      </td>
                      <td className="py-3.5 pr-4 text-right text-muted">
                        {Number(loan.fine_amount) > 0 ? formatCurrency(loan.fine_amount) : '-'}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          late
                            ? 'bg-danger/10 text-danger'
                            : loan.status === 'fine_paid'
                              ? 'bg-success/10 text-success'
                              : settled
                                ? 'bg-surface-hover text-muted'
                                : 'bg-accent/10 text-accent-light'
                        }`}>
                          {late
                            ? 'Overdue'
                            : loan.status === 'fine_paid'
                              ? 'Returned · fine paid'
                              : loan.status === 'returned'
                                ? 'Returned'
                                : 'Issued'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
