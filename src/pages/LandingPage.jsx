import './style-page.css';
import Rack from './Rack';
import MicroController from './MicroController';
import Specialbutton from '../components/SpecialButton';
import Certification from './Certification';
import Footer from './Footer';

function Home() {
    return (
        <div className='layout'>
            <div className="headers">
                <div className="profile">
                    <i className="code fa-solid fa-code"></i>
                </div>
                <h2 className="title">Elan Satria Adi Widodo</h2>
                {/* <h3 className="subtitle">Frontend Web Developer</h3> */}
                <div className="follow-me">
                    <a className="followme-btn" href="https://open.spotify.com/user/31i6jtk52lkjwpcbbdxwlw7qpzoy?
si=QP4RL5b5TMiiHus_YkQXfA" target="__blank" rel="noopener norefferrer" title="Spotify">
                        <i className="spotify fa-brands fa-spotify"></i>
                    </a>&nbsp; | &nbsp;
                    <a className="followme-btn" href="https://discord.gg/WH8azjEu" target="__blank" rel="noopener norefferrer" title="Discord">
                        <i class="discord fa-brands fa-discord"></i>
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
            <Footer />
        </div>
    );
}

export default Home;