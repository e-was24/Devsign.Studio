import './css/style-page.css';
import img1 from '../assets/thumbnail/1.png';
import img2 from '../assets/thumbnail/2.png';
import img3 from '../assets/thumbnail/3.png';
import img4 from '../assets/thumbnail/4.png';

function Rack() {
    // 1. Data project
    const projects = [
        {
            id: 1,
            title: "ISChat",
            link: "https://is-chat-six.vercel.app/",
            img: img1,
            tech: ["js", "react", "css", "html", "psql"],
            status: "Production"
        },
        {
            id: 2,
            title: "TopupinID",
            link: "https://topupin-ten.vercel.app/",
            img: img2,
            tech: ["js", "react", "ts", "html", "css", "psql"],
            status: "Development"
        },
        {
            id: 3,
            title: "Warung Mbk Tutik",
            link: "https://warung-mbaktutik.vercel.app/",
            img: img3,
            tech: ["js", "react", "html", "css", "psql"],
            status: "Production"
        },
        {
            id: 4,
            title: "E-Money",
            link: "https://saveyourmoney-mauve.vercel.app/",
            img: img4,
            tech: ["js", "react", "html", "css", "psql"],
            status: "Development"
        },
    ];

    return (
        <div className="rack">
            
            {/* 2. Looping otomatis menggunakan .map() */}
            {projects.map((project) => (
                <div className="rack-item" key={project.id}>
                    <span className={`status-badge ${project.status.toLowerCase().replace(" ", "-")}`}>
                        {project.status}
                    </span>
                    <h3>{project.title}</h3>

                    {/* Thumbnail background-image */}
                    <div
                        className="thumbnail"
                        style={{ backgroundImage: `url(${project.img})` }}
                    />

                    {/* Rendering Ikon Teknologi */}
                    <div className="project-tech-icons">
                        {project.tech.map((techName, index) => {
                            // Mapping nama tech ke elemen HTML/Ikon yang sesuai
                            const iconComponents = {
                                // FontAwesome Icons
                                "react": <i key={index} className="fa-brands fa-react react"></i>,
                                "node-js": <i key={index} className="fa-brands fa-node-js node-js"></i>,
                                "html": <i key={index} className="fa-brands fa-html5 html"></i>,
                                "css": <i key={index} className="fa-brands fa-css3-alt css"></i>,
                                "js": <i key={index} className="fa-brands fa-js js"></i>,
                                "php": <i key={index} className="fa-brands fa-php php"></i>,
                                "bootstrap": <i key={index} className="fa-brands fa-bootstrap bootstrap"></i>,
                                "figma": <i key={index} className="fa-brands fa-figma figma"></i>,
                                "git": <i key={index} className="fa-brands fa-git-alt git"></i>,
                                "github": <i key={index} className="fa-brands fa-github github"></i>,
                                
                                // Custom Icons (Menggunakan class CSS kamu)
                                "ts": <span key={index} className="icon-typescript"></span>,
                                "nextjs": <span key={index} className="icon-nextjs"></span>,
                                "psql": <span key={index} className="icon-psql"></span>,
                                "vscode": <span key={index} className="icon-vscode"></span>
                            };

                            // Jika techName terdaftar di objek di atas, render ikonnya. Jika tidak, return null.
                            return iconComponents[techName] || null;
                        })}
                    </div>

                    <button className="btn-item">
                        <a href={project.link} target="_blank" rel="noopener noreferrer">
                            {project.title}
                        </a>
                    </button>
                </div>
            ))}
        </div>
    );
}

export default Rack;