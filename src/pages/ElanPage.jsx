import './css/elan-style.css';
import React, { useRef } from "react";
import Rack from './Rack';
import MicroController from './MicroController';
import Specialbutton from '../components/SpecialButton';
import Certification from './Certification';
import gsap from 'gsap';
import { useGSAP } from "@gsap/react";
import { TextPlugin } from 'gsap/TextPlugin';
gsap.registerPlugin(TextPlugin)


function ElanPage() {
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

        gsap.to(".title-elan", {
            duration: 1,
            text: "Elan Satria Adi Widodo",
            ease: "none"
        })
        gsap.from(".special-btn-section .btn", {
            opacity: 0,
            duration: .5,
            onComplite: () => {
                gsap.to(".special-btn-section .btn", {
                    opacity: 1,
                    scale: 1.1
                })
            }
        })
    }, { scope: container });

    return (
        <div className="layout" ref={container}>
            <div className="headers">
                <div className="profile-elan"></div>
                <h2 className="title title-elan"></h2>
                {/* <h3 className="subtitle">Frontend Web Developer</h3> */}
                <div className="follow-me">
                    <a className="followme-btn" href="https://open.spotify.com/user/31i6jtk52lkjwpcbbdxwlw7qpzoy?
si=QP4RL5b5TMiiHus_YkQXfA" target="__blank" rel="noopener norefferrer" title="Spotify">
                        <i className="spotify fa-brands fa-spotify"></i>
                    </a>&nbsp; | &nbsp;
                    <a className="followme-btn" href="https://discord.gg/WH8azjEu" target="__blank" rel="noopener norefferrer" title="Discord">
                        <i className="discord fa-brands fa-discord"></i>
                    </a>
                </div>
                <div className="special-btn-section">
                    <Specialbutton />
                </div>
                <div className="desCover">
                    <div className="deskrip">
                        Language: &nbsp;
                        <i className='html fa-brands fa-html5'></i>&nbsp; | &nbsp;
                        <i className='css fa-brands fa-css3'></i>&nbsp; | &nbsp;
                        <i className='js fa-brands fa-js'></i>&nbsp; | &nbsp;
                        <div className='typescript' style={{ display: 'inline-block' }}></div>&nbsp; | &nbsp;
                        <i className='php fa-brands fa-php'></i>
                    </div>

                    <div className="deskrip">
                        Runtime Environment: &nbsp;
                        <i className='node-js fa-brands fa-node-js'></i>
                    </div>

                    <div className="deskrip">
                        Tools: &nbsp;
                        <i className='figma fa-brands fa-figma'></i>&nbsp; | &nbsp;
                        <i className='git fa-brands fa-git-alt'></i>&nbsp; | &nbsp;
                        <i className='github fa-brands fa-github'></i>&nbsp; | &nbsp;
                        <div className='vscode' style={{ display: 'inline-block' }}></div>&nbsp;
                    </div>

                    <div className="deskrip">
                        Framework: &nbsp;
                        <i className='react fa-brands fa-react'></i>&nbsp; | &nbsp;
                        <i className='bootstrap fa-brands fa-bootstrap'></i>&nbsp; | &nbsp;
                        <div className='nextJs' style={{ display: 'inline-block' }}></div>&nbsp;
                    </div>

                    <div className="deskrip">
                        Data Base: &nbsp;
                        <div className='PSQL' style={{ display: 'inline-block' }}></div>&nbsp;
                    </div>
                </div>
            </div>
            <h1 className='text-border'><span style={{ fontSize: '.8em', fontWeight: '100' }}>Web</span>Project <i className="fa-solid fa-globe"></i></h1>
            <p className='warning'>jangan melakukan transaksi apapun, sistem masih dalam tahap pengembangan!</p>
            <div className="rack-container">
                <Rack />
            </div>
            <div className="microC">
                {/* 1. BAGIAN TECH STACK (Sesuai format HTML murni yang kamu mau) */}
                <div className="desCover-microController">
                    <div className="deskrip">
                        Languages: &nbsp;
                        <div className='cpp' title="C++"></div>&nbsp; C++ | &nbsp;
                        <i className='python fa-brands fa-python' title="MicroPython"></i>&nbsp; Python | &nbsp;
                        <i className='rust fa-brands fa-rust' title="Rust"></i>&nbsp; Rust
                    </div>

                    <div className="deskrip">
                        Frameworks: &nbsp;
                        <i className='arduino fa-solid fa-microchip' title="Arduino"></i>&nbsp; Arduino | &nbsp;
                        <span className='icon-freertos' title="FreeRTOS"></span>&nbsp; FreeRTOS
                    </div>

                    <div className="deskrip">
                        Protocols: &nbsp;
                        <i className='mqtt fa-solid fa-network-wired' title="MQTT"></i>&nbsp; MQTT | &nbsp;
                        <i className='wifi fa-solid fa-wifi' title="HTTP/RestAPI"></i>&nbsp; HTTP
                    </div>

                    <div className="deskrip">
                        Tools: &nbsp;
                        <div className='icon-platformio' title="PlatformIO"></div>&nbsp; PlatformIO | &nbsp;
                        <i className='git fa-brands fa-git-alt'></i>&nbsp; Git
                    </div>
                </div>
            </div>
            <h1 className='text-border'><span style={{ fontSize: '.8em', fontWeight: '100' }}>IoT</span>Project <i className="fa-regular fa-cloud"></i></h1>
            <div className="rack-container-microC">
                <MicroController />
            </div>
            {/* <h1 className='text-border'><span style={{fontSize: '.8em', fontWeight: '100'}}>My</span>Certification &nbsp;<i className="fa-brands fa-google"></i> &nbsp; <span style={{fontSize: '.8em', fontWeight: '100'}}>|</span> &nbsp; <i className="fa-brands fa-aws"></i></h1>
            <div className="rack-container-certification">
                <Certification />
            </div> */}
        </div>
    );
}

export default ElanPage;