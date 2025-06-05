interface FooterProps {
  lastCalculated?: Date | null;
}

export function Footer({ lastCalculated }: FooterProps) {
  return (
    <footer className="bg-white border-t mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-sm text-gray-500">
          <p className="mb-2">
            Svensk Livstidssimulator - Ett verktyg för privatekonomisk planering
          </p>
          <p className="mb-2">
            Baserat på svenska skatte- och pensionsregler för 2025. Använder real prognosmodell (0% inflation).
          </p>
          <p className="text-xs">
            ⚠️ Detta är ett planeringsverktyg och utgör inte finansiell rådgivning.
            Prognoser är osäkra och kan avvika från verkligheten.
          </p>
          {lastCalculated && (
            <p className="text-xs mt-2">
              Senast beräknad: {lastCalculated.toLocaleString('sv-SE')}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}