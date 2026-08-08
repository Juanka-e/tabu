import { LegalDocumentPage, LegalSection } from "@/components/payments/legal-document-page";
import { getPaymentLegalReadiness } from "@/lib/payments/legal";

export const metadata = { robots: { index: false, follow: false } };

export default function CheckoutTermsPage() {
    const legal = getPaymentLegalReadiness();
    return (
        <LegalDocumentPage eyebrow="Satın alma koşulları" title="Dijital Ürün Satın Alma Koşulları" version={legal.checkoutTermsVersion} ready={legal.ready}>
            <LegalSection title="Sipariş ve teslim">
                <p>Satın alınan dijital ürün, ödemenin sağlayıcı tarafından doğrulanmasından sonra siparişte belirtilen kullanıcı hesabına tanımlanır. Başarı yönlendirmesi tek başına ödeme kanıtı değildir.</p>
            </LegalSection>
            <LegalSection title="Hesap ve kullanım">
                <p>Kullanıcı, yalnız kendi hesabı için sipariş verebilir. Ürün devri, hesap satışı ve ödeme akışının otomasyonla kötüye kullanılması yasaktır. Güvenlik incelemesi, oyunla kazanılmış ödüllere otomatik ağır ceza uygulanması anlamına gelmez.</p>
            </LegalSection>
            <LegalSection title="İade ve ödeme itirazı">
                <p>İade, cayma ve dijital içeriğin kullanılmaya başlanmasına ilişkin koşullar ürün ve yürürlükteki mevzuata göre değerlendirilir. Chargeback veya ödeme iptalinde yalnız ilgili ücretli kazanım dondurulabilir ya da geri alınabilir; her olay kayıtlar üzerinden incelenir.</p>
            </LegalSection>
            <LegalSection title="Destek">
                <p>Satın alma desteği: {legal.contactEmail ?? "[Destek e-posta adresi]"}. İşletme: {legal.businessName ?? "[İşletme unvanı]"}.</p>
            </LegalSection>
        </LegalDocumentPage>
    );
}
