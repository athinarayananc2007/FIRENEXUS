import { Satellite, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

interface SatSpec {
  label: string;
  value: string;
}

interface SatelliteCard {
  name: string;
  fullName: string;
  platforms: string;
  description: string;
  color: string;
  borderColor: string;
  specs: SatSpec[];
}

const SATELLITES: SatelliteCard[] = [
  {
    name: 'MODIS',
    fullName: 'Moderate Resolution Imaging Spectroradiometer',
    platforms: 'Terra (1999) & Aqua (2002)',
    description:
      "A key instrument aboard NASA's Terra and Aqua satellites, MODIS captures data in 36 spectral bands ranging from visible to thermal infrared. Its fire products have been the gold standard for over two decades of global fire monitoring.",
    color: 'text-electric',
    borderColor: 'border-electric/30 hover:border-electric/60',
    specs: [
      { label: 'Fire Detection Resolution', value: '1 km' },
      { label: 'Spectral Bands', value: '36' },
      { label: 'Swath Width', value: '2,330 km' },
      { label: 'Revisit Time', value: '~1–2 days' },
      { label: 'Data Record', value: 'Since 2000' },
      { label: 'Key Fire Product', value: 'MOD14 / MYD14' },
    ],
  },
  {
    name: 'VIIRS',
    fullName: 'Visible Infrared Imaging Radiometer Suite',
    platforms: 'Suomi NPP (2011) & NOAA-20 (2017)',
    description:
      'The next-generation successor to MODIS, VIIRS delivers higher spatial resolution active fire detection. With its 375 m I-band data, it can detect smaller and cooler fires than its predecessor, while maintaining consistent global coverage.',
    color: 'text-cyan',
    borderColor: 'border-cyan/30 hover:border-cyan/60',
    specs: [
      { label: 'Fire Detection Resolution', value: '375 m' },
      { label: 'Channels', value: '22' },
      { label: 'Swath Width', value: '3,000 km' },
      { label: 'Revisit Time', value: '~12 hours' },
      { label: 'Data Record', value: 'Since 2012' },
      { label: 'Key Fire Product', value: 'VNP14IMG' },
    ],
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.2, duration: 0.6, ease: 'easeOut' as const },
  }),
};

export default function SatelliteTechnology() {
  return (
    <section className="py-24 sm:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-midnight via-navy/50 to-midnight pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title text-3xl sm:text-4xl">
            Powered by NASA{' '}
            <span className="text-fire">Satellite Technology</span>
          </h2>
          <p className="mt-4 text-text-secondary max-w-2xl mx-auto text-lg">
            Two complementary instruments working in tandem to provide
            continuous, high-fidelity global fire observation.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {SATELLITES.map((sat, i) => (
            <motion.div
              key={sat.name}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className={`card p-6 sm:p-8 transition-all duration-300 ${sat.borderColor}`}
            >
              <div className="flex items-center gap-3 mb-4">
                {i === 0 ? (
                  <Radio className={`w-6 h-6 ${sat.color}`} />
                ) : (
                  <Satellite className={`w-6 h-6 ${sat.color}`} />
                )}
                <div>
                  <h3 className={`text-2xl font-bold ${sat.color}`}>{sat.name}</h3>
                  <p className="text-xs text-text-muted">{sat.fullName}</p>
                </div>
              </div>

              <p className="text-sm text-text-secondary mb-1">
                <span className="font-medium text-text-primary">Platforms:</span>{' '}
                {sat.platforms}
              </p>

              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                {sat.description}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {sat.specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="bg-navy/60 rounded-lg p-3 border border-border/40"
                  >
                    <p className="label-text mb-1">{spec.label}</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {spec.value}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
