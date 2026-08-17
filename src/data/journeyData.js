
// solo
import riskaImg from './img/solo/riskuy.jpeg';
import redCardImg from './img/solo/RED-CARD-IMG.jpeg'
import redCardGif from './img/solo/RED-CARD-GIF.mp4'
import redCardMp4 from './img/solo/RED-CARD.mp4'
import soloCardGif from './img/solo/SOLO-CARD-GIF.mp4'
import soloCardImg from './img/solo/SOLO-CARD-IMG.jpeg'
import soloCardMp4 from './img/solo/SOLO-CARD.mp4'
import photoshow from './img/solo/photoshow.jpeg'

const journeyData = {
  solo: {
    title: "Solo",
    subtitle: "AGU 2026",
    images: [
      // { src: import.meta.url... atau path biasa, alt: "..." }
      // contoh:
      // { src: "/images/solo/1.jpg", alt: "Solo trip 1" },

      { src: riskaImg, alt: "SOLO 15 AGU 2026" },
      { src: redCardImg, alt: "SOLO 15 AGU 2026" },
      { src: redCardGif, alt: "SOLO 15 AGU 2026" },
      { src: redCardMp4, alt: "SOLO 15 AGU 2026" },
      { src: soloCardImg, alt: "SOLO 15 AGU 2026" },
      { src: soloCardGif, alt: "SOLO 15 AGU 2026" },
      { src: soloCardMp4, alt: "SOLO 15 AGU 2026" },
      { src: photoshow, alt: "SOLO 15 AGU 2026" },

    ],
  },
  // contoh entry baru nanti:
  // bareng: {
  //   title: "Bareng Dia",
  //   subtitle: "SEP 2026",
  //   images: [],
  // },
};

export default journeyData;