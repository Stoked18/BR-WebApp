-- AlterTable
ALTER TABLE "Vorgang" ADD COLUMN     "antwortZugangAm" TIMESTAMP(3),
ADD COLUMN     "unterrichtungGeruegtAm" TIMESTAMP(3),
ADD COLUMN     "unterrichtungGeruegtInhalt" TEXT,
ADD COLUMN     "unterrichtungVervollstaendigtAm" TIMESTAMP(3);

