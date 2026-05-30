import Loading from '../components/Loader'

function Certification() {
    return (
        <>
            {/* 2. PRODUCT SHOWCASE (Learning Phase / Loading State) */}
            <div className="iot-loading-wrapper">

                {/* LOTTIE ANIMATION CONTAINER */}
                <div className="loading-cover">
                    <Loading />
                </div>

                <div className="iot-loading-text">
                    <h3>Certification in Progress</h3>
                    <p>
                        We're currently fine-tuning the details. Great things take time,
                        and we're making sure everything is up to industry standards.
                    </p>
                </div>

                {/* Optional: Add a 'Notify Me' button or a Progress Bar here */}
                <div className="progress-bar-mini">
                    <div className="progress-fill" style={{ width: '75%' }}></div>
                </div>
            </div>
        </>
    );
}

export default Certification;