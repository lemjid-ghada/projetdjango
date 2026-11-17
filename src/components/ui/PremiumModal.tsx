import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard, Crown, Lock } from 'lucide-react';
import { apiErrorMessage } from '../../api/client';
import { paymentApi } from '../../api/paymentApi';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';
import { Modal } from './Modal';

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
}

export function PremiumModal({ open, onClose }: PremiumModalProps) {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cardNumber, setCardNumber] = useState('');
  const [expiration, setExpiration] = useState('');
  const [cvv, setCvv] = useState('');
  const [formError, setFormError] = useState('');

  const payment = useMutation({
    mutationFn: () => paymentApi.mockPayment('monthly'),
    onSuccess: async result => {
      if (user) {
        updateUser({
          ...user,
          is_premium: result.is_premium,
          premium_until: result.premium_until,
          is_premium_active: true,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['premium-status'] });
      toast('success', 'Bienvenue dans Premium !');
      onClose();

      try {
        updateUser(await authApi.me());
      } catch {
        toast(
          'warning',
          'Premium est activé, mais le profil n’a pas pu être actualisé depuis le serveur.',
        );
      }
    },
    onError: error => toast('error', apiErrorMessage(error, 'Le paiement simulé a échoué.')),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const digits = cardNumber.replace(/\s/g, '');
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiration);
    if (!/^\d{16}$/.test(digits)) {
      setFormError('Saisissez un numéro de carte fictif de 16 chiffres.');
      return;
    }
    if (!match) {
      setFormError('Utilisez le format MM/AA pour la date d’expiration.');
      return;
    }
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      setFormError('La date d’expiration doit être dans le futur.');
      return;
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      setFormError('Le CVV doit contenir 3 ou 4 chiffres.');
      return;
    }
    setFormError('');
    payment.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Passer à Premium" size="md">
      <div className="space-y-5 p-5">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Crown className="h-5 w-5" /> EduLearn Premium
          </div>
          <p className="mt-2 text-xs leading-5 text-indigo-100">
            Débloquez les outils avancés pour apprendre sans interruption.
          </p>
          <ul className="mt-4 space-y-2 text-xs">
            {['Tuteur IA illimité', 'Quiz finaux', 'Certificats'].map(benefit => (
              <li key={benefit} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-300" /> {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Simulation uniquement :</strong> aucun paiement réel n’est effectué.
          N’utilisez pas de vraies informations bancaires.
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Numéro de carte fictif
            <span className="relative mt-1.5 block">
              <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoComplete="off"
                inputMode="numeric"
                maxLength={19}
                value={cardNumber}
                onChange={event => setCardNumber(event.target.value.replace(/[^\d ]/g, ''))}
                placeholder="1234 5678 9012 3456"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Expiration
              <input
                autoComplete="off"
                inputMode="numeric"
                maxLength={5}
                value={expiration}
                onChange={event => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
                  setExpiration(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                }}
                placeholder="MM/AA"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              CVV fictif
              <input
                autoComplete="off"
                inputMode="numeric"
                maxLength={4}
                value={cvv}
                onChange={event => setCvv(event.target.value.replace(/\D/g, ''))}
                placeholder="123"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
          </div>
          {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={payment.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
          >
            {payment.isPending ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Traitement en cours...</>
            ) : (
              <><Lock className="h-4 w-4" /> Payer 9,99 € / mois</>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
}
