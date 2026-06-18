import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ImageOptimizerService {
  /**
   * Resizes a sponsor logo to a maximum width of 400px.
   */
  async resizeForSponsor(file: File): Promise<Blob | File> {
    return this.comprimeerAfbeeldingMetAfmetingen(file, 400, 400);
  }

  /**
   * Resizes a news image to a maximum width of 1000px.
   */
  async resizeForNews(file: File): Promise<Blob | File> {
    return this.comprimeerAfbeeldingMetAfmetingen(file, 1000, 1000);
  }

  /**
   * Generieke methode om een afbeelding te verkleinen en te comprimeren.
   */
  async comprimeerAfbeelding(file: File): Promise<Blob | File> {
    // Standaard gedrag behouden voor algemene aanroepen (1200px)
    return this.comprimeerAfbeeldingMetAfmetingen(file, 1200, 1200);
  }

  private async comprimeerAfbeeldingMetAfmetingen(
    file: File,
    maxWidth: number,
    maxHeight: number,
  ): Promise<Blob | File> {
    // Als het bestand al kleiner is dan 100KB en het is een kleine afbeelding, hoeven we niets te doen
    // Maar we checken hier vooral op bestandsgrootte voor de 'snelle' skip.
    // Voor de zekerheid verwerken we bestanden boven de 200KB altijd om afmetingen te checken.
    if (file.size < 200 * 1024 && !file.type.includes('image/jpeg')) {
       // Voor hele kleine bestanden die geen JPEG zijn, laten we ze vaak met rust tenzij we echt afmetingen willen forceren.
       // Maar hier forceren we de resize logica als het over de limiet gaat.
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Verhoudingen behouden bij het verkleinen
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          // Als de afbeelding al kleiner is dan de limieten, en het bestand is niet overdreven groot,
          // kunnen we besluiten om het origineel te behouden.
          if (width === img.width && height === img.height && file.size < 500 * 1024) {
            return resolve(file);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(file); // Origineel behouden bij fout
          ctx.drawImage(img, 0, 0, width, height);

          // Comprimeer naar JPEG met 80% kwaliteit (of PNG voor transparantie)
          const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          canvas.toBlob((blob) => resolve(blob || file), outputFormat, 0.85);
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  }
}
