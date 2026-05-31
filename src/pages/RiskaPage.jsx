import './css/riska-style.css';
import Rack from './Rack';
import MicroController from './MicroController';
import Specialbutton from '../components/SpecialButton';
import Certification from './Certification';
import gsap from 'gsap';
import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { TextPlugin } from 'gsap/TextPlugin';
gsap.registerPlugin(TextPlugin);
import Kucingku from '../components/KucingKu'


function RiskaPage() {

    const container = useRef();
    
        useGSAP(() => {
    
            gsap.from(".follow-me .followme-btn", {
                opacity: 0,
                scale: 0.5,
                duration: 0.5,
                stagger: 0.2,
                delay: 0.3,
                ease: "back.out(1.7)"
            })
    
            gsap.from(".profile-elan", {
                opacity: 0,
                delay: .1,
                duration: .5
            })
    
            gsap.to(".title-riska", {
                duration: 1,
                text: "Riska Diana Putri",
                ease: "none"
            })
        }, { scope: container });

    return (
        <div className="layout" ref={container}>
            <div className="headers">
                <div className="profile-riska"></div>
                <h2 className="title title-riska"></h2>
                {/* <h3 className="subtitle">Frontend Web Developer</h3> */}
                <div className="follow-me">
                    <a className="followme-btn" href="https://open.spotify.com/user/31utljy4n6ahzyg23zowfixjxfai?si=93ddd2d4e42a4728" target="__blank" rel="noopener norefferrer" title="Spotify">
                        <i className="spotify fa-brands fa-spotify"></i>
                    </a>&nbsp; | &nbsp;
                    <a className="followme-btn" href="https://www.instagram.com/riskadnaputriii_?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="__blank" rel="noopener norefferrer" title="Instagram">
                        <i className="instagram fa-brands fa-instagram"></i>
                    </a>
                </div>
                <div className="desCover">
                    <div className="deskrip">
                        Human Anatomy: &nbsp;
                        <i className='bone fa-solid fa-bone'></i>&nbsp; | &nbsp;
                        <i className='brain fa-solid fa-brain'></i>&nbsp; | &nbsp;
                        <i className='droplet fa-solid fa-droplet'></i>
                    </div>

                    <div className="deskrip">
                        Biological Systems: &nbsp;
                        <i className='dna fa-solid fa-dna'></i>&nbsp; | &nbsp;
                        <i className='virus fa-solid fa-virus'></i>
                    </div>

                    <div className="deskrip">
                        Dental Specialties: &nbsp;
                        <i className='tooth fa-solid fa-tooth'></i>&nbsp; | &nbsp;
                        <i className='microscope fa-solid fa-microscope'></i>
                    </div>
                </div>
            </div>

            <div className="pet-section">
                <Kucingku />
            </div>
        </div>
    );
}

export default RiskaPage;