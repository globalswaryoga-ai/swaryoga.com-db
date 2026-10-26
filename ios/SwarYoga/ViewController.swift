import UIKit
import WebKit

/**
 * Swar Yoga - Native iOS Application Entry
 *
 * Implements:
 * - Native WKWebView with hardware accelerated WebKit rendering
 * - Swar Vedic deep-green theme & status bar
 * - Splash screen with animated transition
 * - Cookie & LocalStorage persistent authentication
 * - Safe area handling for Dynamic Island / Notches
 * - External link interception (WhatsApp, Zoom, YouTube, Tel)
 * - Offline & connectivity recovery UI with Retry button
 */
class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {

    private var webView: WKWebView!
    private var progressView: UIProgressView!
    private var splashView: UIView!
    private var errorView: UIView!
    private var activityIndicator: UIActivityIndicatorView!

    private let baseURL = URL(string: "https://swaryoga.com")!
    private let primaryDarkColor = UIColor(red: 10/255.0, green: 40/255.0, blue: 30/255.0, alpha: 1.0) // #0A281E

    override func viewDidLoad() {
        super.viewDidLoad()
        setupTheme()
        setupWebView()
        setupProgressBar()
        setupErrorView()
        setupSplashView()
        loadMainWebsite()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    private func setupTheme() {
        view.backgroundColor = primaryDarkColor
    }

    private func setupWebView() {
        let contentController = WKUserContentController()
        contentController.add(self, name: "swarYogaNative")

        // Inject viewport & touch callouts
        let userScript = WKUserScript(
            source: "window.isSwarYogaIOSApp = true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        contentController.addUserScript(userScript)

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.websiteDataStore = WKWebsiteDataStore.default()

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.backgroundColor = primaryDarkColor
        webView.isOpaque = false
        webView.scrollView.backgroundColor = primaryDarkColor

        view.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
    }

    private func setupProgressBar() {
        progressView = UIProgressView(progressViewStyle: .default)
        progressView.translatesAutoresizingMaskIntoConstraints = false
        progressView.progressTintColor = UIColor(red: 234/255.0, green: 179/255.0, blue: 8/255.0, alpha: 1.0) // Gold
        progressView.trackTintColor = .clear
        view.addSubview(progressView)

        NSLayoutConstraint.activate([
            progressView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progressView.heightAnchor.constraint(equalToConstant: 3)
        ])
    }

    private func setupSplashView() {
        splashView = UIView()
        splashView.translatesAutoresizingMaskIntoConstraints = false
        splashView.backgroundColor = primaryDarkColor
        view.addSubview(splashView)

        NSLayoutConstraint.activate([
            splashView.topAnchor.constraint(equalTo: view.topAnchor),
            splashView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            splashView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            splashView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        let logoImageView = UIImageView()
        logoImageView.translatesAutoresizingMaskIntoConstraints = false
        logoImageView.contentMode = .scaleAspectFit
        if let image = UIImage(named: "SplashLogo") {
            logoImageView.image = image
        }
        splashView.addSubview(logoImageView)

        let titleLabel = UILabel()
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.text = "SWAR YOGA"
        titleLabel.textColor = .white
        titleLabel.font = UIFont.systemFont(ofSize: 26, weight: .bold)
        titleLabel.textAlignment = .center
        splashView.addSubview(titleLabel)

        let subtitleLabel = UILabel()
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.text = "Vedic Wisdom • Sadhana • Transformation"
        subtitleLabel.textColor = UIColor(white: 0.8, alpha: 1.0)
        subtitleLabel.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        subtitleLabel.textAlignment = .center
        splashView.addSubview(subtitleLabel)

        activityIndicator = UIActivityIndicatorView(style: .large)
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        activityIndicator.color = UIColor(red: 234/255.0, green: 179/255.0, blue: 8/255.0, alpha: 1.0)
        activityIndicator.startAnimating()
        splashView.addSubview(activityIndicator)

        NSLayoutConstraint.activate([
            logoImageView.centerXAnchor.constraint(equalTo: splashView.centerXAnchor),
            logoImageView.centerYAnchor.constraint(equalTo: splashView.centerYAnchor, constant: -70),
            logoImageView.widthAnchor.constraint(equalToConstant: 120),
            logoImageView.heightAnchor.constraint(equalToConstant: 120),

            titleLabel.topAnchor.constraint(equalTo: logoImageView.bottomAnchor, constant: 18),
            titleLabel.centerXAnchor.constraint(equalTo: splashView.centerXAnchor),

            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            subtitleLabel.centerXAnchor.constraint(equalTo: splashView.centerXAnchor),

            activityIndicator.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 36),
            activityIndicator.centerXAnchor.constraint(equalTo: splashView.centerXAnchor)
        ])
    }

    private func setupErrorView() {
        errorView = UIView()
        errorView.translatesAutoresizingMaskIntoConstraints = false
        errorView.backgroundColor = primaryDarkColor
        errorView.isHidden = true
        view.addSubview(errorView)

        NSLayoutConstraint.activate([
            errorView.topAnchor.constraint(equalTo: view.topAnchor),
            errorView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            errorView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            errorView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        let errorTitle = UILabel()
        errorTitle.translatesAutoresizingMaskIntoConstraints = false
        errorTitle.text = "Connection Error"
        errorTitle.textColor = .white
        errorTitle.font = UIFont.systemFont(ofSize: 22, weight: .bold)
        errorTitle.textAlignment = .center
        errorView.addSubview(errorTitle)

        let errorMsg = UILabel()
        errorMsg.translatesAutoresizingMaskIntoConstraints = false
        errorMsg.text = "Please check your internet connection and try again."
        errorMsg.textColor = UIColor(white: 0.75, alpha: 1.0)
        errorMsg.font = UIFont.systemFont(ofSize: 15)
        errorMsg.numberOfLines = 0
        errorMsg.textAlignment = .center
        errorView.addSubview(errorMsg)

        let retryButton = UIButton(type: .system)
        retryButton.translatesAutoresizingMaskIntoConstraints = false
        retryButton.setTitle("Retry", for: .normal)
        retryButton.setTitleColor(.white, for: .normal)
        retryButton.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        retryButton.backgroundColor = UIColor(red: 234/255.0, green: 179/255.0, blue: 8/255.0, alpha: 1.0)
        retryButton.layer.cornerRadius = 10
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        errorView.addSubview(retryButton)

        NSLayoutConstraint.activate([
            errorTitle.centerXAnchor.constraint(equalTo: errorView.centerXAnchor),
            errorTitle.centerYAnchor.constraint(equalTo: errorView.centerYAnchor, constant: -40),

            errorMsg.topAnchor.constraint(equalTo: errorTitle.bottomAnchor, constant: 10),
            errorMsg.leadingAnchor.constraint(equalTo: errorView.leadingAnchor, constant: 30),
            errorMsg.trailingAnchor.constraint(equalTo: errorView.trailingAnchor, constant: -30),

            retryButton.topAnchor.constraint(equalTo: errorMsg.bottomAnchor, constant: 25),
            retryButton.centerXAnchor.constraint(equalTo: errorView.centerXAnchor),
            retryButton.widthAnchor.constraint(equalToConstant: 160),
            retryButton.heightAnchor.constraint(equalToConstant: 46)
        ])
    }

    private func loadMainWebsite() {
        errorView.isHidden = true
        let request = URLRequest(url: baseURL, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 30)
        webView.load(request)
    }

    @objc private func retryTapped() {
        errorView.isHidden = true
        if splashView.alpha == 0 {
            splashView.alpha = 1
        }
        activityIndicator.startAnimating()
        loadMainWebsite()
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "estimatedProgress" {
            progressView.progress = Float(webView.estimatedProgress)
            if webView.estimatedProgress >= 1.0 {
                UIView.animate(withDuration: 0.3, animations: {
                    self.progressView.alpha = 0
                }) { _ in
                    self.progressView.progress = 0
                }
            } else {
                progressView.alpha = 1.0
            }
        }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        errorView.isHidden = true
        UIView.animate(withDuration: 0.5, delay: 0.8, options: .curveEaseInOut, animations: {
            self.splashView.alpha = 0
        }) { _ in
            self.activityIndicator.stopAnimating()
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        handleLoadError(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        handleLoadError(error)
    }

    private func handleLoadError(_ error: Error) {
        let nsError = error as NSError
        if nsError.code == NSURLErrorCancelled { return }
        errorView.isHidden = false
        splashView.alpha = 0
        activityIndicator.stopAnimating()
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        let scheme = url.scheme?.lowercased() ?? ""

        // External app deep links (WhatsApp, Zoom, YouTube, Tel, Mail)
        if scheme == "whatsapp" || scheme == "zoomus" || scheme == "tel" || scheme == "mailto" ||
           (url.host?.contains("youtube.com") == true || url.host?.contains("youtu.be") == true) ||
           (url.host?.contains("wa.me") == true) {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
                decisionHandler(.cancel)
                return
            }
        }

        // Open non-swaryoga external URLs in system browser (Safari)
        if let host = url.host, !host.contains("swaryoga.com") && navigationAction.navigationType == .linkActivated {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }

    // MARK: - JavaScript Bridge
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "swarYogaNative" {
            print("Received Native message: \(message.body)")
        }
    }

    deinit {
        webView?.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
    }
}
