import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  FeeIcon,
  DownloadIcon,
  CalendarIcon,
  LoaderIcon,
  ShieldIcon,
  LockIcon,
  CheckIcon,
  RefreshIcon
} from '../../utils/icons';
import { formatDate, formatCurrency, getStatusColor } from '../../utils/helpers';
import { feeAPI } from '../../services/api';
import { generateReceiptPDF } from '../../utils/receiptGenerator';

function loadCashfreeScript() {
  return new Promise((resolve) => {
    if (window.Cashfree) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function StudentFees() {
  const { user } = useAuth();
  const [structure, setStructure] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pendingDues, setPendingDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [processing, setProcessing] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchFees();
    const params = new URLSearchParams(window.location.search);
    const returnOrderId = params.get('cf_order_id') || params.get('order_id');
    if (returnOrderId) {
      verifyReturnedPayment(returnOrderId);
    }
  }, []);

  const verifyReturnedPayment = async (orderId) => {
    try {
      setLoading(true);
      const res = await feeAPI.verifyPayment({ order_id: orderId });
      if (res.success) {
        setSuccessMsg('Payment verified successfully! Receipt is ready to download.');
        window.history.replaceState({}, document.title, window.location.pathname);
        await fetchFees();
      } else {
        setError(res.message || 'Payment verification failed');
      }
    } catch (err) {
      setError(err.message || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReceipt = async (pay) => {
    setError('');
    setDownloadingId(pay.id);
    try {
      const res = await feeAPI.getReceipt(pay.id);
      const receiptData = res.success && res.data ? res.data : pay;
      await generateReceiptPDF({
        ...receiptData,
        first_name: receiptData.first_name || user?.profile?.first_name || user?.first_name,
        last_name: receiptData.last_name || user?.profile?.last_name || user?.last_name,
        email: receiptData.email || user?.email,
        phone: receiptData.phone || user?.profile?.phone,
        roll_number: receiptData.roll_number || user?.profile?.roll_number,
      });
    } catch (err) {
      setError(err.message || 'Failed to download PDF receipt. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchFees = async () => {
    try {
      setLoading(true);
      setError('');
      const studentId = user?.profile?.id;
      const [structRes, payRes] = await Promise.allSettled([
        feeAPI.getStructure({ student_id: studentId }).catch(() => ({ success: false, data: [] })),
        feeAPI.getPayments(studentId).catch(() => ({ success: false, data: {} })),
      ]);
      if (structRes.status === 'fulfilled' && structRes.value.success) {
        let data = structRes.value.data || [];
        if (data.length === 0) {
          const fallback = await feeAPI.getStructure({});
          if (fallback.success) data = fallback.data || [];
        }
        setStructure(Array.isArray(data) ? data : []);
      }
      if (payRes.status === 'fulfilled' && payRes.value.success) {
        const payData = payRes.value.data;
        setPayments(payData?.payments || (Array.isArray(payData) ? payData : []));
        setPendingDues(payData?.pending_dues || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load fee records');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (feeItem = null) => {
    try {
      if (!feeItem && pendingDues.length === 0) {
        setError('There are no pending dues to pay.');
        return;
      }

      const target = feeItem || pendingDues[0];
      const structureId = target.fee_structure_id || target.id;

      if (!structureId) {
        setError('A pending due is missing its fee reference. Please contact accounts.');
        return;
      }

      setProcessing(structureId);
      setError('');

      const cashfreeLoaded = await loadCashfreeScript();
      if (!cashfreeLoaded || !window.Cashfree) {
        setError('Failed to load secure payment gateway. Please check your internet connection.');
        setProcessing(null);
        return;
      }

      const response = await feeAPI.createOrder({
        fee_structure_id: structureId,
      });

      if (!response.success || !response.data?.payment_session_id) {
        setError(response.message || 'Failed to initialize secure checkout');
        setProcessing(null);
        return;
      }

      const { payment_session_id, environment } = response.data;
      const cashfree = window.Cashfree({
        mode: environment === 'sandbox' ? 'sandbox' : 'production',
      });

      await cashfree.checkout({
        paymentSessionId: payment_session_id,
        redirectTarget: '_self',
      });
    } catch (err) {
      setError(err.message || 'Payment initiation failed');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading secure fee records..." />;

  const totalFee = structure.reduce((s, item) => s + parseFloat(item.amount || 0), 0);
  const paidAmount = payments
    .filter((p) => p.status === 'paid' || p.status === 'completed' || p.status === 'success')
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const pendingAmount =
    pendingDues.reduce((s, item) => s + parseFloat(item.pending_amount || item.balance || item.amount || 0), 0) ||
    Math.max(0, totalFee - paidAmount);
  const totalPaidCount = payments.filter(
    (p) => p.status === 'paid' || p.status === 'completed' || p.status === 'success'
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Fees & Finance Management"
          subtitle="View university fee schedule, payment history, and download official receipts"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFees}
            className="btn btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
            title="Refresh records"
          >
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Security Assurance Banner */}
      <div className="rounded-xl border border-accent/25 bg-accent/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent-light flex-shrink-0">
            <ShieldIcon size={18} />
          </div>
          <div>
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>PCI-DSS Certified 256-Bit Encrypted Payments</span>
              <span className="badge badge-success text-[10px] px-1.5 py-0.5">Verified</span>
            </div>
            <p className="text-muted mt-0.5">
              All transactions are secured end-to-end via Cashfree Payment Gateway with instant official CVM University receipts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-light flex-shrink-0">
          <LockIcon size={14} className="text-success" />
          <span>SSL Secured</span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">{error}</span>
          </div>
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

      {/* Stat Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          icon={<FeeIcon size={22} />}
          label="Total Fee Allocated"
          value={formatCurrency(totalFee)}
          color="primary"
          subtext="Current Academic Year"
        />
        <StatCard
          icon={<FeeIcon size={22} />}
          label="Amount Paid"
          value={formatCurrency(paidAmount)}
          color="success"
          subtext={`${totalPaidCount} cleared payment${totalPaidCount === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={<FeeIcon size={22} />}
          label="Outstanding Dues"
          value={formatCurrency(pendingAmount)}
          color={pendingAmount > 0 ? 'warning' : 'success'}
          subtext={pendingAmount > 0 ? 'Payment pending' : 'All clear'}
        />
      </div>

      {/* Pending Dues High-Priority Banner (if any) */}
      {pendingDues.length > 0 && (
        <div className="card border-warning/30 bg-warning/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse" />
              <h3 className="text-base font-semibold text-white">Action Required: Pending Dues</h3>
            </div>
            <span className="badge badge-warning text-xs font-medium">
              {pendingDues.length} Pending
            </span>
          </div>
          <div className="space-y-3">
            {pendingDues.map((due) => {
              const dueId = due.fee_structure_id || due.id;
              const dueAmt = parseFloat(due.pending_amount || due.balance || due.amount || 0);
              return (
                <div
                  key={dueId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-surface-raised border border-surface-border gap-4"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-white">{due.fee_type || 'Tuition Fee'}</h4>
                    <p className="text-xs text-muted mt-0.5">
                      Semester {due.semester || 'N/A'} {due.due_date ? `| Due by: ${formatDate(due.due_date)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[11px] text-muted block uppercase tracking-wider">Amount Due</span>
                      <span className="text-lg font-bold text-warning font-mono">{formatCurrency(dueAmt)}</span>
                    </div>
                    <button
                      onClick={() => handlePay(due)}
                      disabled={processing === dueId}
                      className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-2"
                    >
                      {processing === dueId ? (
                        <>
                          <LoaderIcon size={14} className="animate-spin" />
                          <span>Securing Checkout...</span>
                        </>
                      ) : (
                        <>
                          <LockIcon size={13} />
                          <span>Pay with Cashfree</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fee Structure Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Fee Structure & Breakdown</h3>
            <p className="text-xs text-muted mt-0.5">Approved academic fee heads for your enrolled curriculum</p>
          </div>
          <span className="text-xs text-muted-light font-mono">
            {structure.length} Head{structure.length === 1 ? '' : 's'}
          </span>
        </div>

        {structure.length === 0 ? (
          <EmptyState
            icon={FeeIcon}
            title="No Fee Structure"
            description="Fee details have not been published for your course semester."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Fee Head</th>
                  <th className="text-left py-3 pr-4">Semester</th>
                  <th className="text-right py-3 pr-4">Amount</th>
                  <th className="text-center py-3 pr-4">Due Date</th>
                  <th className="text-center py-3">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {structure.map((item, idx) => {
                  const isPaid = payments.some(
                    (p) =>
                      (p.fee_structure_id === item.id || p.fee_head_id === item.id) &&
                      (p.status === 'paid' || p.status === 'completed' || p.status === 'success')
                  );
                  return (
                    <tr key={item.id || idx} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="py-3.5 pr-4 text-white font-medium">
                        {item.fee_type || item.fee_head || item.name || 'Tuition Fee'}
                      </td>
                      <td className="py-3.5 pr-4 text-muted text-xs">
                        Semester {item.semester || '1'}
                      </td>
                      <td className="py-3.5 pr-4 text-right text-white font-mono font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-3.5 pr-4 text-center text-muted text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarIcon size={13} className="text-muted-light" />
                          {item.due_date ? formatDate(item.due_date) : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        {isPaid ? (
                          <span className="badge badge-success text-xs inline-flex items-center gap-1">
                            <CheckIcon size={12} />
                            Paid
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePay(item)}
                            disabled={processing === item.id}
                            className="btn btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                          >
                            {processing === item.id ? (
                              <>
                                <LoaderIcon size={12} className="animate-spin" />
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <LockIcon size={12} />
                                <span>Pay Now</span>
                              </>
                            )}
                          </button>
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

      {/* Payment History & Download Official Receipt */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Payment History & Tax Invoices</h3>
            <p className="text-xs text-muted mt-0.5">Verified university transactions with digitally generated PDF receipts</p>
          </div>
          <span className="text-xs text-muted-light font-mono">
            {payments.length} Transaction{payments.length === 1 ? '' : 's'}
          </span>
        </div>

        {payments.length === 0 ? (
          <EmptyState
            icon={FeeIcon}
            title="No Payment Records Found"
            description="You haven't made any fee payments yet. Cleared transactions will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Receipt #</th>
                  <th className="text-left py-3 pr-4">Transaction Date</th>
                  <th className="text-left py-3 pr-4">Fee Category</th>
                  <th className="text-left py-3 pr-4">Channel</th>
                  <th className="text-right py-3 pr-4">Amount</th>
                  <th className="text-center py-3 pr-4">Status</th>
                  <th className="text-right py-3">Download PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {payments.map((pay, idx) => {
                  const receiptNo = pay.receipt_no || pay.transaction_id || `REC-${pay.id}`;
                  const isDownloading = downloadingId === pay.id;
                  const isSuccess =
                    pay.status === 'completed' || pay.status === 'success' || pay.status === 'paid';
                  return (
                    <tr key={pay.id || idx} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="py-3.5 pr-4 font-mono text-xs text-accent-light font-medium">
                        #{receiptNo}
                      </td>
                      <td className="py-3.5 pr-4 text-muted text-xs">
                        {formatDate(pay.paid_at || pay.payment_date || pay.created_at || pay.date)}
                      </td>
                      <td className="py-3.5 pr-4 text-white text-xs font-medium">
                        {pay.fee_type || 'Tuition Fees'}
                      </td>
                      <td className="py-3.5 pr-4 text-muted text-xs uppercase">
                        {pay.payment_method || 'Online'}
                      </td>
                      <td className="py-3.5 pr-4 text-right text-white font-mono font-semibold">
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            pay.status
                          )}`}
                        >
                          {(pay.status || 'completed').charAt(0).toUpperCase() +
                            (pay.status || 'completed').slice(1)}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        {isSuccess ? (
                          <button
                            type="button"
                            onClick={() => handleReceipt(pay)}
                            disabled={isDownloading}
                            className="btn btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 text-white hover:border-accent hover:text-accent-light transition-all shadow-sm"
                            title="Download Official CVM / ADIT PDF Receipt"
                          >
                            {isDownloading ? (
                              <>
                                <LoaderIcon size={13} className="animate-spin" />
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <DownloadIcon size={13} />
                                <span>Official PDF</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-muted">N/A</span>
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
  );
}
