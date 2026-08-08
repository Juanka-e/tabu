import { LegalDocumentPage, LegalSection } from "@/components/payments/legal-document-page";
import { getPaymentLegalReadiness } from "@/lib/payments/legal";

export const metadata = { robots: { index: false, follow: false } };

export default function DistanceSalesPreInformationPage() {
    const legal = getPaymentLegalReadiness();
    return (
        <LegalDocumentPage eyebrow="Sipariş öncesi" title="Mesafeli Satış Ön Bilgilendirme" version={legal.distanceSalesNoticeVersion} ready={legal.ready}>
            <LegalSection title="Satıcı bilgileri">
                <p>Unvan: {legal.businessName ?? "[İşletme unvanı]"}</p>
                <p>Adres: {legal.businessAddress ?? "[Açık işletme adresi]"}</p>
                <p>E-posta: {legal.contactEmail ?? "[İletişim e-posta adresi]"}</p>
            </LegalSection>
            <LegalSection title="Ürün ve toplam bedel">
                <p>Ürünün temel nitelikleri, adet, toplam bedel, para birimi ve varsa vergiler checkout özetinde sipariş verilmeden hemen önce gösterilir. Kullanıcı, ödeme yükümlülüğü doğuran işlemi açık bir butonla onaylar.</p>
            </LegalSection>
            <LegalSection title="Teslim ve ifa">
                <p>Dijital ürün, ödeme doğrulandıktan sonra seçilen kullanıcı hesabına elektronik ortamda teslim edilir. Tahmini teslim ve sipariş durumu checkout ekranından izlenir.</p>
            </LegalSection>
            <LegalSection title="Cayma, iade ve uyuşmazlık">
                <p>Dijital içerik bakımından cayma hakkının kullanımı, ifaya ne zaman başlandığı ve mevzuattaki istisnalar dahil somut sipariş koşullarına göre belirlenir. Nihai metin hukuk danışmanı tarafından işletme ve ürün modeline göre onaylanmadan ödeme açılamaz.</p>
            </LegalSection>
        </LegalDocumentPage>
    );
}
