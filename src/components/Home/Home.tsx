import { APP_STRINGS } from '../../constants/strings'
import './Home.css'

function Home() {
  const { title, subtitle, description } = APP_STRINGS.home

  return (
    <main className="home">
      <section className="home__hero">
        <h1 className="home__title">{title}</h1>
        <p className="home__subtitle">{subtitle}</p>
        <p className="home__description">{description}</p>
      </section>
    </main>
  )
}

export default Home
